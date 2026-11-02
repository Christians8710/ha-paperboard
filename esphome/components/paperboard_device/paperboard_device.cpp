#include "paperboard_device.h"
#include "esphome/core/application.h"
#include "esphome/core/helpers.h"
#include "esphome/core/log.h"
#include "esphome/components/json/json_util.h"
#include "esphome/components/sha256/sha256.h"
#include "esphome/components/wifi/wifi_component.h"
#include "esp_partition.h"
#include "esp_random.h"
#include <cstring>

namespace esphome::paperboard_device {
static const char *const TAG = "paperboard";

bool PaperBoardDevice::read_config_() {
  const auto *partition = esp_partition_find_first(ESP_PARTITION_TYPE_DATA,
      static_cast<esp_partition_subtype_t>(0x40), "paperboard");
  if (!partition || partition->address != 0x1ff0000 || partition->size != 65536) return false;
  std::array<uint8_t, 64> header{};
  if (esp_partition_read(partition, 0, header.data(), header.size()) != ESP_OK) return false;
  if (std::memcmp(header.data(), "PB02CFG\0", 8) != 0) return false;
  const uint32_t length = uint32_t(header[8]) | (uint32_t(header[9]) << 8) |
      (uint32_t(header[10]) << 16) | (uint32_t(header[11]) << 24);
  if (length == 0 || length > 4096) return false;
  std::string payload(length, '\0');
  if (esp_partition_read(partition, 64, payload.data(), length) != ESP_OK) return false;
  sha256::SHA256 hash;
  hash.init(); hash.add(payload.data(), length); hash.calculate();
  if (!hash.equals_bytes(header.data()+12)) return false;
  JsonDocument doc;
  if (deserializeJson(doc, payload)) return false;
  if (doc["schema"].as<int>() != 1 || doc["model"].as<std::string>() != "e1002") return false;
  ssid_ = doc["ssid"].as<std::string>(); wifi_password_ = doc["password"].as<std::string>();
  base_url_ = doc["base_url"].as<std::string>(); entry_id_ = doc["entry_id"].as<std::string>();
  token_ = doc["token"].as<std::string>(); install_id_ = doc["install_id"].as<std::string>();
  ota_password_ = doc["ota_password"].as<std::string>();
  const std::string key = doc["api_key_hex"].as<std::string>();
  if (ssid_.empty() || ssid_.size() > 32 || wifi_password_.size() > 64 || token_.size() < 32 ||
      token_.size() > 128 || token_.find_first_of("\r\n") != std::string::npos ||
      entry_id_.empty() || entry_id_.size() > 80 || entry_id_.find_first_not_of("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-") != std::string::npos ||
      install_id_.size() != 32 || ota_password_.size() < 24 || key.size() != 64 ||
      !parse_hex(key, api_key_.data(), api_key_.size()) ||
      (base_url_.rfind("https://",0) != 0 && base_url_.rfind("http://",0) != 0)) return false;
  int interval = doc["refresh_interval"].as<int>();
  pages_ = doc["pages"].as<int>();
  if (interval < 60 || interval > 86400 || pages_ < 1 || pages_ > 12) return false;
  interval_ms_ = uint32_t(interval)*1000;
  rotated_ = doc["rotated"].as<bool>();
  return true;
}

void PaperBoardDevice::setup() {
  boot_id_ = esp_random();
  valid_ = read_config_();
  if (!valid_) {
    wifi::global_wifi_component->set_enable_on_boot(false);
    ESP_LOGE(TAG, "USB-Konfiguration fehlt oder ist ungueltig. Installer erneut ausfuehren.");
    mark_failed(); return;
  }
  wifi::WiFiAP sta; sta.set_ssid(ssid_); sta.set_password(wifi_password_);
  wifi::global_wifi_component->set_sta(sta);
  wifi::global_wifi_component->set_enable_on_boot(true);
  api_->set_noise_psk(api_key_.data());
  ota_->set_auth_password(ota_password_);
  display_->set_rotation(rotated_ ? display::DISPLAY_ROTATION_90_DEGREES : display::DISPLAY_ROTATION_0_DEGREES);
  image_->add_request_header("X-PaperBoard-Token", token_);
  ESP_LOGI(TAG, "PaperBoard 0.3.1: USB-Konfiguration geladen (keine Zugangsdaten im Protokoll).");
}

void PaperBoardDevice::loop() {
  if (!valid_) return;
  const uint32_t now = millis();
  if (!wifi::global_wifi_component->is_connected()) { connected_=false; return; }
  if (!connected_) { connected_=true; next_update_=now+2000; }
  if (retry_at_ && int32_t(now-retry_at_)>=0) { retry_at_=0; refresh(); }
  else if (!busy_ && int32_t(now-next_update_)>=0) refresh();
}

void PaperBoardDevice::sync_() {
  JsonDocument doc;
  doc["model"]="e1002"; doc["version"]="0.3.1"; doc["install_id"]=install_id_;
  doc["boot_id"]=std::to_string(boot_id_); doc["downloaded"]=downloaded_;
  if (battery_->has_state() && std::isfinite(battery_->state)) doc["battery"]=battery_->state;
  if (temperature_->has_state() && std::isfinite(temperature_->state)) doc["temperature"]=temperature_->state;
  if (humidity_->has_state() && std::isfinite(humidity_->state)) doc["humidity"]=humidity_->state;
  std::string body; serializeJson(doc, body);
  std::vector<http_request::Header> headers{{"Content-Type","application/json"},{"X-PaperBoard-Token",token_}};
  auto response=http_->post((base_url_+"/api/paperboard/device/"+entry_id_+"/sync").c_str(),body,headers);
  if (!response) return;
  if (response->status_code==200 && response->content_length>0 && response->content_length<2048) {
    std::string raw(response->content_length,'\0');
    size_t pos=0;
    while (pos<raw.size()) {
      const auto count=response->read(reinterpret_cast<uint8_t *>(raw.data()+pos),raw.size()-pos);
      if (count<=0) break;
      pos+=count;
    }
    raw.resize(pos);
    JsonDocument config;
    if (!deserializeJson(config,raw)) {
      const int pages=config["pages"].as<int>(), interval=config["refresh_interval"].as<int>();
      if (pages>=1 && pages<=12) { pages_=pages; page_%=pages_; }
      if (interval>=60 && interval<=86400) interval_ms_=uint32_t(interval)*1000;
      rotated_=config["rotated"].as<bool>();
      display_->set_rotation(rotated_ ? display::DISPLAY_ROTATION_90_DEGREES : display::DISPLAY_ROTATION_0_DEGREES);
    }
  }
  response->end();
}

void PaperBoardDevice::refresh(bool force) {
  if (!valid_ || busy_ || !wifi::global_wifi_component->is_connected()) return;
  busy_=true; retry_at_=0;
  sync_(); load_image_(force);
  next_update_=millis()+interval_ms_;
}

void PaperBoardDevice::load_image_(bool force) {
  const std::string url=base_url_+"/api/paperboard/image/"+entry_id_+"/"+std::to_string(page_);
  if (force || url!=last_url_) { image_->set_url(url); last_url_=url; }
  image_->update();
}

void PaperBoardDevice::page(int delta) {
  if (!valid_ || busy_) return;
  page_=(page_+delta+pages_)%pages_;
  refresh();
}

void PaperBoardDevice::image_finished(bool cached) {
  downloaded_=true; busy_=false;
  if (!cached) display_->update();
  // Report the successful download after the display refresh has had time to start.
  set_timeout("confirm", 25000, [this]() { if (wifi::global_wifi_component->is_connected() && !busy_) sync_(); });
}

void PaperBoardDevice::image_error() {
  busy_=false; retry_at_=millis()+60000;
  ESP_LOGW(TAG,"Bildabruf fehlgeschlagen; vorhandenes Bild bleibt erhalten, erneuter Versuch in 60 s.");
}
}

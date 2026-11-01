#pragma once
#include "esphome/core/component.h"
#include "esphome/components/api/api_server.h"
#include "esphome/components/display/display.h"
#include "esphome/components/esphome/ota/ota_esphome.h"
#include "esphome/components/http_request/http_request.h"
#include "esphome/components/online_image/online_image.h"
#include "esphome/components/sensor/sensor.h"
#include <array>

namespace esphome::paperboard_device {
class PaperBoardDevice : public Component {
 public:
  void setup() override;
  void loop() override;
  float get_setup_priority() const override { return 750.0f; }
  void set_image(online_image::OnlineImage *v) { image_ = v; }
  void set_display(display::Display *v) { display_ = v; }
  void set_http(http_request::HttpRequestComponent *v) { http_ = v; }
  void set_api(api::APIServer *v) { api_ = v; }
  void set_ota(ESPHomeOTAComponent *v) { ota_ = v; }
  void set_battery(sensor::Sensor *v) { battery_ = v; }
  void set_temperature(sensor::Sensor *v) { temperature_ = v; }
  void set_humidity(sensor::Sensor *v) { humidity_ = v; }
  void page(int delta);
  void refresh(bool force = false);
  void image_finished(bool cached);
  void image_error();
 protected:
  bool read_config_();
  void sync_();
  void load_image_(bool force);
  online_image::OnlineImage *image_{nullptr};
  display::Display *display_{nullptr};
  http_request::HttpRequestComponent *http_{nullptr};
  api::APIServer *api_{nullptr};
  ESPHomeOTAComponent *ota_{nullptr};
  sensor::Sensor *battery_{nullptr}, *temperature_{nullptr}, *humidity_{nullptr};
  std::array<uint8_t, 32> api_key_{};
  std::string base_url_, entry_id_, token_, install_id_, ota_password_, ssid_, wifi_password_, last_url_;
  uint32_t interval_ms_{900000}, next_update_{0}, retry_at_{0}, boot_id_{0};
  int page_{0}, pages_{3};
  bool valid_{false}, connected_{false}, busy_{false}, rotated_{false}, downloaded_{false};
};
}

import {ESPLoader,Transport} from 'esptool-js';
import SparkMD5 from 'spark-md5';
import {writeE1002} from '../custom_components/paperboard/frontend/flash-core.js';
export async function flash(options){
  return writeE1002({...options,
    createLoader:port=>{const transport=new Transport(port,false);const loader=new ESPLoader({transport,baudrate:115200,debugLogging:false,terminal:{clean(){},write(){},writeLine(){}}});return {transport,loader};},
    md5:data=>SparkMD5.ArrayBuffer.hash(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength))});
}

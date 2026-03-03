import { SerialPort } from 'serialport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SerialService {
  constructor() {}
  
  async acceder() {
      const ports = await SerialPort.list();
      ports.forEach(port => {
        console.log(`${port.path} - ${port.manufacturer || 'Unknown'} - ${port.pnpId || ''}`);
      });

    console.log("accediendo");
    const port = new SerialPort({
        path: 'COM6',  // Linux — on Windows use 'COM3'
        baudRate: 9600,
    });

    port.on('open', () => {
        port.write('R01', (err) => {
            if (err) console.error('Error:', err.message);
            else console.log('R01 command sent');
        });
    });

    // Listen for relay response
    port.on('data', (data) => {
        console.log('Response:', data.toString());
    });
  }
}
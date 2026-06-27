const { exec } = require('child_process');

exec('powershell -Command "Get-WmiObject -Class Win32_Printer | Select-Object Name, DeviceID, PortName"', (err, stdout) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    console.log('Impresoras instaladas:');
    console.log(stdout);
});


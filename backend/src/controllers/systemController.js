import { exec } from 'child_process';

// Apaga el equipo donde corre el backend (pensado para el Raspberry Pi que
// actúa como controlador). Requiere que el usuario con el que corre este
// proceso tenga permiso para ejecutar `shutdown`/`poweroff` sin contraseña
// vía sudoers (ver /etc/sudoers.d/ en la guía de despliegue) — sin eso,
// `exec` simplemente fallará con un error de permisos, que se registra
// pero no se expone con detalle al cliente.
export function shutdown(req, res) {
  res.json({ status: 'shutting-down' });

  // Se responde primero y se espera un instante antes de apagar, para que
  // el navegador/cliente reciba la confirmación antes de perder la conexión.
  setTimeout(() => {
    exec('sudo /sbin/shutdown -h now', (error) => {
      if (error) {
        console.error('No se pudo apagar el sistema:', error.message);
      }
    });
  }, 500);
}

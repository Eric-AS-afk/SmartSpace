export const homeActions = [
  {
    id: 'new-project',
    title: 'Nuevo Proyecto',
    description: 'Crear una nueva sesión de dibujo con plano base, escala y parámetros iniciales.',
    route: '/espacio-dibujo',
    accent: 'primary'
  },
  {
    id: 'open-project',
    title: 'Abrir Proyecto',
    description: 'Cargar proyectos recientes o archivos guardados para continuar el trabajo.',
    route: '/proyectos/abrir',
    accent: 'secondary'
  },
  {
    id: 'settings',
    title: 'Configuración',
    description: 'Ajustar tema visual, accesos rápidos, unidades y preferencias de trabajo.',
    route: '/configuracion',
    accent: 'neutral'
  },
  {
    id: 'help',
    title: 'Ayuda',
    description: 'Consultar guía de uso, atajos, conceptos del sistema y soporte técnico.',
    route: '/ayuda',
    accent: 'neutral'
  }
];
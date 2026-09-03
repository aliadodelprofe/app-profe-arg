import { User, Announcement, Benefit, PushNotification, ScheduleClass, FormationLevelConfig, Convocatoria, RegularClass, PaymentMethod, SiteConfig, MerchConfig, MerchProduct } from '../types';

import heroImg from '../assets/images/regenerated_image_1785346633773.jpg';
import socialImg from '../assets/images/bachata_social_party_1785268131868.jpg';
import tomasAstridImg from '../assets/images/tomas_astrid_directors_1785352326713.jpg';

export const INITIAL_SITE_CONFIG: SiteConfig = {
  homeCoverImage: heroImg,
  directorsCoverImage: tomasAstridImg,
  faviconUrl: '/favicon.png',
  siteLogoUrl: '/favicon.png',
  homeVideoUrl: '/videos/recap_ta.mp4',
  homeVideoPosterUrl: '/videos/recap_ta_poster.jpg',
  muxPlaybackId: 'JV8ISH6c93R69p7E00Tztv1YBzyOeYEl9Y9PoDz7n02KU'
};

export const INITIAL_PAYMENT_METHODS: PaymentMethod[] = [];

export const INITIAL_FORMATION_CONFIGS: FormationLevelConfig[] = [
  {
    id: 'nivel-1',
    name: 'Bachata Influence - Nivel 1',
    subtitle: 'Formación Inicial & Fundamentos del Estilo',
    totalClasses: 8,
    minAttendancePercent: 75,
    minClassesForCert: 6,
    activeClassNumber: 5, // Classes 1..5 unlocked for recaps
    activeRecapVersionId: 'v1',
    recapVersions: [
      {
        id: 'v1',
        name: 'Versión 1 — Fundamentos & Figuras Clásicas',
        description: 'Enfoque en marco limpio, disociación de torso y secuencias orgánicas fundamentales.',
        recaps: [
          {
            classNumber: 1,
            title: 'Clase 1: Postura, Marco & Disociación Básica',
            description: 'Técnica de transferencia de peso, postura en pareja y primera combinación con impulso y contratiempo.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase1'
          },
          {
            classNumber: 2,
            title: 'Clase 2: Ondas Corporales & Conexión de Torso',
            description: 'Onda frontal, lateral y disociación de caja torácica. Aplicación en básico lateral e intencionalidad.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase2'
          },
          {
            classNumber: 3,
            title: 'Clase 3: Giros con Acento & Control de Inercia',
            description: 'Mecánica de giros en Lead y Follow, frenos con marco suave y cambio de dirección dinámico.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase3'
          },
          {
            classNumber: 4,
            title: 'Clase 4: Headrolls Iniciales & Seguridad Cervical',
            description: 'Técnica de guía segura para giros de cabeza, preparación de espalda y puntos de apoyo firmes.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase4'
          },
          {
            classNumber: 5,
            title: 'Clase 5: Secuencia Completa Nivel 1 - Parte 1',
            description: 'Integración de ondas, giro con freno e ingreso a sombra con musicalidad en bloque de 8 tiempos.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase5'
          },
          {
            classNumber: 6,
            title: 'Clase 6: Cambré Seguro & Dinámicas de Aceleración',
            description: 'Técnica de soporte de peso, inclinación axial limpia y matices dinámicos con la música.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase6'
          },
          {
            classNumber: 7,
            title: 'Clase 7: Limpieza Estética & Expresión Corporal',
            description: 'Uso de brazos en Follower, líneas de estilo para Leader y fluidez sin interrupciones.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase7'
          },
          {
            classNumber: 8,
            title: 'Clase 8: Examen de Evaluación & Coreografía Final',
            description: 'Muestra coreográfica de graduación de Nivel 1. Ejecución de la secuencia con musicalidad completa.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase8'
          }
        ]
      },
      {
        id: 'v2',
        name: 'Versión 2 — Estilo Urbano & Aislamientos Dinámicos',
        description: 'Combinaciones dinámicas con acentos de hip-pop, frenos sincopados y contra-tiempos.',
        recaps: [
          {
            classNumber: 1,
            title: 'Clase 1: Disociación Pélvica & Acentuación Urbana',
            description: 'Aislamiento de cadera y hombros con musicalidad urbana en bloque de 8 tiempos.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-v2-clase1'
          },
          {
            classNumber: 2,
            title: 'Clase 2: Frenos Secos & Giro Sincopado',
            description: 'Detención inmediata en el tiempo 4 y giro acelerado en tiempo 5-6-7.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-v2-clase2'
          },
          {
            classNumber: 3,
            title: 'Clase 3: Transición a Sombra con Cambio de Mano',
            description: 'Mecánica de pase de manos a espaldas con marco suave e impulso de Follower.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-v2-clase3'
          },
          {
            classNumber: 4,
            title: 'Clase 4: Ondas Inversas & Disociación de Cuello',
            description: 'Guía de onda ascendente con preparación previa y seguridad en zona lumbar.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-v2-clase4'
          },
          {
            classNumber: 5,
            title: 'Clase 5: Combo Signature V2 - Parte 1',
            description: 'Muestra de combinación urbana con cambré lateral e interrupción musical.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-v2-clase5'
          },
          {
            classNumber: 6,
            title: 'Clase 6: Puntería en Giros Dobles & Ajuste Axial',
            description: 'Preparación de doble giro para Follower con eje vertical sostenido.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-v2-clase6'
          },
          {
            classNumber: 7,
            title: 'Clase 7: Estilo de Brazos Sincronizado',
            description: 'Acompañamiento estético de brazos sin afectar el marco de pareja.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-v2-clase7'
          },
          {
            classNumber: 8,
            title: 'Clase 8: Evaluación & Demo de Versión 2',
            description: 'Filmación final de la rutina urbana de Nivel 1 para certificación.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-v2-clase8'
          }
        ]
      }
    ],
    recaps: [
      {
        classNumber: 1,
        title: 'Clase 1: Postura, Marco & Disociación Básica',
        description: 'Técnica de transferencia de peso, postura en pareja y primera combinación con impulso y contratiempo.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase1'
      },
      {
        classNumber: 2,
        title: 'Clase 2: Ondas Corporales & Conexión de Torso',
        description: 'Onda frontal, lateral y disociación de caja torácica. Aplicación en básico lateral e intencionalidad.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase2'
      },
      {
        classNumber: 3,
        title: 'Clase 3: Giros con Acento & Control de Inercia',
        description: 'Mecánica de giros en Lead y Follow, frenos con marco suave y cambio de dirección dinámico.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase3'
      },
      {
        classNumber: 4,
        title: 'Clase 4: Headrolls Iniciales & Seguridad Cervical',
        description: 'Técnica de guía segura para giros de cabeza, preparación de espalda y puntos de apoyo firmes.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase4'
      },
      {
        classNumber: 5,
        title: 'Clase 5: Secuencia Completa Nivel 1 - Parte 1',
        description: 'Integración de ondas, giro con freno e ingreso a sombra con musicalidad en bloque de 8 tiempos.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase5'
      },
      {
        classNumber: 6,
        title: 'Clase 6: Cambré Seguro & Dinámicas de Aceleración',
        description: 'Técnica de soporte de peso, inclinación axial limpia y matices dinámicos con la música.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase6'
      },
      {
        classNumber: 7,
        title: 'Clase 7: Limpieza Estética & Expresión Corporal',
        description: 'Uso de brazos en Follower, líneas de estilo para Leader y fluidez sin interrupciones.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase7'
      },
      {
        classNumber: 8,
        title: 'Clase 8: Examen de Evaluación & Coreografía Final',
        description: 'Muestra coreográfica de graduación de Nivel 1. Ejecución de la secuencia con musicalidad completa.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel1-clase8'
      }
    ]
  },
  {
    id: 'nivel-2',
    name: 'Bachata Influence - Nivel 2',
    subtitle: 'Formación Avanzada, Micro-Conexión & Flow',
    totalClasses: 8,
    minAttendancePercent: 75,
    minClassesForCert: 6,
    activeClassNumber: 3, // Classes 1..3 unlocked for recaps
    activeRecapVersionId: 'n2-v1',
    recapVersions: [
      {
        id: 'n2-v1',
        name: 'Versión 1 — Master Combo & Micro-Disociaciones',
        description: 'Enfoque avanzado en guías imperceptibles, micro-impulsos y polirritmias.',
        recaps: [
          {
            classNumber: 1,
            title: 'Clase 1: Re-Conexión & Micro-Impulsos de Cadera',
            description: 'Mecánica de micro-movimientos imperceptibles, respiración en pareja y guías no verbales de alta precisión.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase1'
          },
          {
            classNumber: 2,
            title: 'Clase 2: Isolaciones Sincronizadas & Asimetrías',
            description: 'Movimientos disociados independientes torso/cadera, contra-ritmos y juego de aceleración.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase2'
          },
          {
            classNumber: 3,
            title: 'Clase 3: Complex Headrolls & Transiciones Circulares',
            description: 'Giros orgánicos de cabeza en movimiento, cambio de eje en eje continuo y entradas continuas.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase3'
          },
          {
            classNumber: 4,
            title: 'Clase 4: Liftings Bajos & Apoyos de Equilibrio',
            description: 'Técnica de suspensión sin esfuerzo corporal, distribución de peso y salidas fluidas.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase4'
          },
          {
            classNumber: 5,
            title: 'Clase 5: Estructura de Musicalidad Av. - Mambo & Requinto',
            description: 'Interpretación de cortes de instrumento, improvisación sobre polirritmias y dinámicas de contraste.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase5'
          },
          {
            classNumber: 6,
            title: 'Clase 6: Secuencia Master Influence - Complejidad 100%',
            description: 'Armado del combo signature de Tomás & Astrid para escenario y baile social de alto nivel.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase6'
          },
          {
            classNumber: 7,
            title: 'Clase 7: Performance Practice & Presencia Escénica',
            description: 'Proyección de energía, contacto visual, estética escénica y control de nerviosismo.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase7'
          },
          {
            classNumber: 8,
            title: 'Clase 8: Graduación Nivel 2 & Muestra Oficial',
            description: 'Filmación y evaluación final de graduación con entrega de certificados oficiales de Bachata Influence.',
            driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase8'
          }
        ]
      }
    ],
    recaps: [
      {
        classNumber: 1,
        title: 'Clase 1: Re-Conexión & Micro-Impulsos de Cadera',
        description: 'Mecánica de micro-movimientos imperceptibles, respiración en pareja y guías no verbales de alta precisión.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase1'
      },
      {
        classNumber: 2,
        title: 'Clase 2: Isolaciones Sincronizadas & Asimetrías',
        description: 'Movimientos disociados independientes torso/cadera, contra-ritmos y juego de aceleración.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase2'
      },
      {
        classNumber: 3,
        title: 'Clase 3: Complex Headrolls & Transiciones Circulares',
        description: 'Giros orgánicos de cabeza en movimiento, cambio de eje en eje continuo y entradas continuas.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase3'
      },
      {
        classNumber: 4,
        title: 'Clase 4: Liftings Bajos & Apoyos de Equilibrio',
        description: 'Técnica de suspensión sin esfuerzo corporal, distribución de peso y salidas fluidas.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase4'
      },
      {
        classNumber: 5,
        title: 'Clase 5: Estructura de Musicalidad Av. - Mambo & Requinto',
        description: 'Interpretación de cortes de instrumento, improvisación sobre polirritmias y dinámicas de contraste.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase5'
      },
      {
        classNumber: 6,
        title: 'Clase 6: Secuencia Master Influence - Complejidad 100%',
        description: 'Armado del combo signature de Tomás & Astrid para escenario y baile social de alto nivel.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase6'
      },
      {
        classNumber: 7,
        title: 'Clase 7: Performance Practice & Presencia Escénica',
        description: 'Proyección de energía, contacto visual, estética escénica y control de nerviosismo.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase7'
      },
      {
        classNumber: 8,
        title: 'Clase 8: Graduación Nivel 2 & Muestra Oficial',
        description: 'Filmación y evaluación final de graduación con entrega de certificados oficiales de Bachata Influence.',
        driveUrl: 'https://drive.google.com/drive/folders/bachata-influence-nivel2-clase8'
      }
    ]
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-tomas-astrid-official',
    email: 'tomas.astrid.bachata@gmail.com',
    password: 'admin',
    isTemporaryPassword: false,
    fullName: 'Tomás & Astrid',
    dni: 'Director Principal',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
    role: 'admin',
    memberCode: 'TA-DIR-0000',
    level: 'Directores & Instructores - TA Bachata Academy',
    nivel1Completed: true,
    nivel2Completed: true,
    nivel1Date: 'Diciembre 2023',
    nivel2Date: 'Diciembre 2024',
    activeFormationId: null,
    memberSince: 'DICIEMBRE 2023',
    status: 'active',
    claimedBenefits: ['ben-1', 'ben-2'],
    pushEnabled: true,
    phone: '+54 9 11 5544-3322'
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

export const INITIAL_BENEFITS: Benefit[] = [];

export const INITIAL_NOTIFICATIONS: PushNotification[] = [];

export const INITIAL_REGULAR_CLASSES: RegularClass[] = [];

export const INITIAL_CONVOCATORIAS: Convocatoria[] = [];

export const INITIAL_MERCH_CONFIG: MerchConfig = {
  enabled: true,
  batchName: 'Artículos oficiales de la Academy',
  batchDescription: '¡Lanzamiento exclusivo de artículos oficiales de TA Bachata Academy! Reservá el tuyo abonando el 50% de seña o el total.',
  batchDeadline: 'Pedidos abiertos hasta el 31 de Agosto',
  bankAlias: '',
  bankCbu: '',
  bankHolder: '',
  bankName: '',
  sizeGuideUrl: '',
  sizingInstructionUrl: ''
};

export const INITIAL_MERCH_PRODUCTS: MerchProduct[] = [
  {
    id: 'prod-1',
    title: 'Remera Oficial TA Bachata Academy - Oversize Black',
    description: 'Remera 100% algodón peinado premium. Estampa serigrafiada en frente y espalda con el sello oficial de la academia.',
    price: 18000,
    depositPrice: 9000,
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Negro', 'Blanco', 'Gris Melange'],
    isActive: true,
    category: 'Remeras',
    createdAt: Date.now()
  },
  {
    id: 'prod-2',
    title: 'Remera Oficial TA Bachata Academy - Classic White',
    description: 'Edición especial en algodón suave respirable, corte clásico unisex ideal para clases y ensayos.',
    price: 16000,
    depositPrice: 8000,
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Blanco', 'Negro'],
    isActive: true,
    category: 'Remeras',
    createdAt: Date.now()
  }
];



import chatAnalytics from '../assets/img/home/chat_analytics.png';
import reportsImage from '../assets/img/home/reports.jpeg';
import visualisationImage from '../assets/img/home/visualisation.jpeg';

export const sections = [
  {
    key: 'about',
    title: 'L’intelligence de vos données, en toute clarté',
    label: 'À propos',
    icon: '✨',
    image: chatAnalytics,
    badge: 'Plateforme\nBI + IA',
    description:
      'Be IT Africa transforme vos données microfinance en décisions actionnables. Analysez, visualisez et créez des rapports sans effort grâce à un assistant conversationnel intelligent conçu pour le pilotage métier.',
  },
  {
    key: 'reports',
    title: 'Vos rapports décisionnels, rédigés en un clic',
    label: 'Rapports',
    icon: '📄',
    image: reportsImage,
    badge: 'Rapports\nautomatiques',
    description:
      'Ne perdez plus de temps à interpréter des courbes ou à rédiger manuellement des synthèses. Notre moteur transforme vos graphiques et tableaux en livrables clairs, structurés et prêts à partager.',
  },
  {
    key: 'visualisation',
    title: 'Vos indicateurs clés, centralisés et visuels',
    label: 'Visualisation',
    icon: '📊',
    image: visualisationImage,
    badge: 'Tableaux\nde bord',
    description:
      'Consolidez vos flux opérationnels dans des tableaux de bord dynamiques et simples à piloter. Suivez la santé de vos activités et repérez les opportunités en un coup d’œil.',
  },
];

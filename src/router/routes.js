
const routes = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
//      { path: '', component: () => import('pages/Index.vue') }
      { path: '/', component: () => import('pages/Index.vue'), title: 'Inicio', meta: { titulo: 'Inicio', showFilter: false } },
      { path: '/encuestas', component: () => import('pages/encuestas.vue'), title: 'Encuestas', meta: { titulo: 'Encuestas', showFilter: true } }

    ]
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue')
  }
]

export default routes

<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          C-XP
        </q-toolbar-title>

        <q-toolbar-title>
          {{ titulo }}
        </q-toolbar-title>

        <div>Certus Lab</div>

         <q-btn round class="q-ml-sm" color="white" icon="home" flat to="/">
          <!-- <q-tooltip>Inicio...</q-tooltip> -->
        </q-btn>

      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      bordered
      class="bg-grey-3"
      :width="250"
      
      :mini="miniState"
      @mouseover="miniState = false"
      @mouseout="miniState = true"
      mini-to-overlay
    >
      <q-list>
        <q-btn class="q-ma-sm" color="primary" icon="home" label="" flat to="/" no-caps />

        <q-separator inset />

        <EssentialLink
          v-for="link in essentialLinks"
          :key="link.title"
          v-bind="link"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script>
  
import { defineComponent, ref } from 'vue'
import EssentialLink from 'components/EssentialLink.vue'

const linksList = [
  {
    title: 'Encuestas SurveyMonkey',
    caption: 'Consulta y Seguimiento',
    icon: 'manage_accounts',
    to: '/encuestas',
    link: 'https://quasar.dev'
  },
]

export default defineComponent({
  name: 'MainLayout',

  components: {
    EssentialLink
  },

  setup () {
    const leftDrawerOpen = ref(false)
    const miniState = ref(true)
    return {
      essentialLinks: linksList,
      leftDrawerOpen,
      miniState,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      }
    }
  },

  mounted() {
    //console.log("MainLayout - Mounted - ruta", this.$router.currentRoute.value.meta.titulo)
 },

  computed: {
    titulo: function() {
//      let route = this.$route
//      return ( this.$router.options.routes[0].children.filter(v => v.path == route.path)[0].title || '' )
      return this.$router.currentRoute.value.meta.titulo
    }
  }

})
</script>

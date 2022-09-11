<template>
  <q-layout view="lHh Lpr lFf">
    <q-header>
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

        <!-- <q-btn
          flat
          dense
          round
          icon="filter_alt"
          dark
          aria-label="filter"
          v-show="showFilter"
        /> -->


        <!-- <q-btn
          round
          color="white"
          icon="mdi-file-excel-outline"
          flat
          :loading="$store.state.example.generaExcel"
          v-show="showFilter"
          @click="loadingExcel = true; $store.commit('example/mutGeneraExcel', true)"
        >
          <q-tooltip>Generar archivo en Excel</q-tooltip>
        </q-btn>

        <q-btn
          round
          color="white"
          icon="today"
          flat
          v-show="showFilter"
          @click="$store.commit('example/mutDlgFechas', true)"
        >
          <q-tooltip>Filtro de Encuestas por Fecha</q-tooltip>
        </q-btn>

        <q-select
          v-model="filtro"
          :options="filtros"
          label="Clasificaciones"
          class="q-ml-md"
          filled
          dark
          color="info"
          dense
          options-dense
          max-width="100px"
          v-show="showFilter"
          @update:model-value="filtroSeleccionado"

          @input-value="selectEvents('input-value')"
          @filter="selectEvents('filter')"
          @popup-show="selectEvents('popup-show')"
          @popup-hide="selectEvents('popup-hide')"

        >
          <template v-slot:prepend>
            <q-icon name="filter_alt" dark />
          </template>
          <q-tooltip anchor="top left">Filtrar por Clasificación</q-tooltip>
        </q-select>

        <q-select
          v-model="sucursal"
          class="q-ml-sm"
          :options="sucursales"
          label="Sucursales"
          dark
          color="info"
          filled
          dense
          options-dense
          v-show="showFilter"
          @update:model-value="filtroSucursal"
        >
          <template v-slot:prepend>
            <q-icon name="mdi-office-building" />
          </template>
          <q-tooltip anchor="top left">Filtrar por Sucursal</q-tooltip>
        </q-select>

        <q-toolbar-title v-show="showFilter">
          <q-input
            v-model="txtFiltro"
            dark
            dense
            standout
            placeholder="Buscar"
            color="indigo-2"
            class="q-mr-none q-pr-none"
            style="max-width: 300px"
            clearable
            @update:model-value="inputFilter()"
          />
        </q-toolbar-title> -->

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
        <q-btn class="q-ml-sm" color="primary" round icon="home" label="" flat to="/" no-caps />

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
import { useStore } from 'vuex'
import config from '../../config.json'

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
    const $store = useStore()
    const leftDrawerOpen = ref(false)
    const miniState = ref(true)
    let txtFiltro = ref(null)
    let showFilter = ref(false)
    let filtros = ref(["Todas", "Felicitaciones", "Sugerencias", "Quejas"])
    let filtro = ref(null)
    let fechas = ref({
      desde: new Date().toLocaleDateString('en-CA'),
      hasta: new Date().toLocaleDateString('en-CA')
    })

    return {
      essentialLinks: linksList,
      leftDrawerOpen,
      miniState,
      toggleLeftDrawer () {
        leftDrawerOpen.value = !leftDrawerOpen.value
      },
      txtFiltro,
      showFilter,
      inputFilter () {
        // Afecto store.state.example
        this.$store.commit('example/mainLayoutFilter', this.txtFiltro)
      },
      filtros,
      filtro,
      filtroSeleccionado(item) {
        // Afecto store.state.example
console.log("@update:model-value", new Date().toLocaleTimeString() )
        $store.commit("example/surveyFilter", item.substr(0, 1))
      },

      selectEvents(evento) {
        console.log("evento", evento, new Date().toLocaleTimeString() )
      },

      loadingExcel: ref(false),
      sucursales: ref([]),
      sucursal: ref(null),
      filtroSucursal(item) {
        $store.commit("example/mutSucursal", item)
      },

    }
  },

  mounted() {
    //console.log("MainLayout store", this.$store.state.example.filtro)
    this.filtro = this.filtros[0] // "Todas" las encuestas por default
    this.$axios({
      url: `${config.backendUrl}/api/sucursales`,
      method: "get"
    }).then(resp => {
      this.sucursales = resp.data.data
      this.sucursal = this.sucursales[0]
    })
  },

  computed: {
    titulo: function() {
//      let route = this.$route
//      return ( this.$router.options.routes[0].children.filter(v => v.path == route.path)[0].title || '' )
      this.showFilter = false //this.$router.currentRoute.value.meta.showFilter
console.log("showFilter", this.showFilter)
      return this.$router.currentRoute.value.meta.titulo
    },
  },

})
</script>
<style lang="sass" scoped>
myInput
  color: f0f6ff
</style>

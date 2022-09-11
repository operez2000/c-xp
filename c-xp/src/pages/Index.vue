<template>
  <q-page class="flex flex-center">
    <img
      alt="Logo de Certus"
      src="~assets/certus.png"
      style="width: 200px; height: 200px"
      @click="show"
    >
  </q-page>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { useQuasar } from 'quasar'

export default defineComponent({
  name: 'PageIndex',
  setup () {
    const numero = ref(0)
    const $q = useQuasar()
    //console.log("(index.vue) Plataforma...", $q.platform)
    /*
    function show () {
      console.log("Versión de Quasar", $q.version)
    }
    */
    return {
      numero,
      show () {
        console.log("Versión de Quasar...", $q.version)
      },
    }
  }
})

</script>

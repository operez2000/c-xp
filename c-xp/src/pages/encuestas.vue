<template>
  <q-page>

    <div class="contenedor">
      <div class="encuestas barra">
        <div class="q-ma-sm">
          <!-- Filtro de búsqueda -->
          <q-input
            rounded
            outlined
            v-model="filtro"
            placeholder="Buscar"
            color="white"
            dense
            dark
            clearable
            @update:model-value="filtrar()"
          />
        </div>
        <q-separator dark />
        <!-- Despliegue de encuestas -->
        <q-list separator dark dense>
          <q-item
            v-for="(response, index) in responses"
            :key="response.id"
            clickable
            v-ripple
            @click="showDetail(index)"
            :active="response.active"
            active-class="activo"            
          >
            <!-- Avatar -->
            <q-item-section class="q-my-sm" avatar>
              <q-avatar size="md" style="color: white;" :color="response.color" dense>
                {{ response.first_name.substr(0, 1) + response.last_name.substr(0, 1) }}
              </q-avatar>
            </q-item-section>
            <!-- Nombre del Paciente y No. de Orden -->
            <q-item-section>
              <q-item-label><span style="color: white;">{{ response.first_name + ' ' + response.last_name }}</span></q-item-label>
              <q-item-label caption lines="1">{{ response.custom_value }}</q-item-label>
            </q-item-section>

            <q-item-section side top>
              <!-- <q-icon name="circle" size="small" color="white" v-show="response.active" /> -->
              <q-icon class="q-mt-sm" name="circle" size="small" color="white" v-show="response.active" />
              <q-item-label class="q-mt-sm" caption>{{ index + 1 }}</q-item-label>
            </q-item-section>
              
          </q-item>
        </q-list>

      </div>

      <div class="q-pa-md detalle barra">
        <div v-if="lastClicked >= 0">
          <!-- <div class="text-h4 q-mb-md">
            <span :class="`bg-${clasificacion.color} q-px-sm`">{{ clasificacion.descripcion }}</span>
          </div> -->
          <q-input :class="`bg-${clasificacion.color} q-px-sm text-h6`"  v-model="clasificacion.descripcion" label="Clasificación" dark readonly />
          <br>
          <div class="row justify-between">
            <div class="col-auto">
              <span class="titulo">Paciente:</span> {{ response.first_name + ' ' + response.last_name }}
            </div>
            <div class="col-auto">
              {{ response.id }}
            </div>
          </div>
          <p></p>
          <!-- <q-separator class="q-mb-md" dark /> -->
          <p><span class="titulo">Email: </span> {{ response.metadata.contact.email.value }}</p>
          <p><span class="titulo">Orden: </span> {{ response.custom_value }}</p>
          <p><span class="titulo">Fecha Orden: </span> {{ response.metadata.contact.custom_value2.value }}</p>
          <p><span class="titulo">Recepcionista: </span> {{ response.metadata.contact.custom_value3.value }}</p>
          <p><span class="titulo">Flebotomista: </span> {{ response.metadata.contact.custom_value4.value }}</p>
          <p><span class="titulo">Sucursal: </span> {{ response.metadata.contact.custom_value5.value }}</p>
          <p><span class="titulo">Fecha Entrega: </span> {{ response.metadata.contact.custom_value6.value }}</p>
          <q-separator class="q-mb-md" dark />
          <p><span class="titulo">Respuesta: </span> {{ txtRespuesta }}</p>
          <!-- <pre>
            {{ response }}
          </pre> -->
        </div>
        <div class="row justify-center" v-else>
          <h5>No se ha seleccionado ninguna Encuesta</h5>
        </div>
        <div class="row justify-center">
          <q-spinner color="white" size="3em" v-show="loading" />
        </div>
        <div class="row justify-center" v-show="lastClicked < 0">
          <q-circular-progress
            show-value
            :value="progress"
            size="50px"
            :thickness="0.15"
            color="teal"
            track-color="grey-3"
            class="q-ma-md"
          >
            {{ progress }}%
          </q-circular-progress>        
        </div>

      </div>

    </div>    

    <!-- Fab button para configuraciones -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab size="sm" icon="settings" color="green" glossy @click="settings = true" />
    </q-page-sticky>

    <!-- Configuraciones -->
    <q-dialog v-model="settings">
      <q-card class="my-card q-pa-sm">
        <q-card-section>
          <div class="text-h6">
            <q-icon name="settings" />
            Configuraciones
          </div>
        </q-card-section>
        <hr>
        <q-card-section>
          <q-list class="rounded-borders">
            <q-expansion-item
              expand-separator
              icon="search"
              label="Parámetros de Búsqueda"
              caption="Filtros"
              header-class="text-blue-10"
              group="somegroup"
              popup
            >
              <q-card class="my-card">
                <!-- Surveys -->
                <q-card-section>
                  <q-select
                    v-model="survey"
                    :options="surveys"
                    option-value="id"
                    option-label="title"
                    label="Encuestas"                    
                    filled
                    @update:model-value="getCollectors()"
                  />
                </q-card-section>
                <!-- Collectors -->
                <q-card-section>
                  <q-select
                    v-model="collector"
                    :options="collectors"
                    option-value="id"
                    option-label="name"
                    label="Recolectores"
                    @update:model-value="getResponses()"
                    filled
                  />
                </q-card-section>                
              </q-card>
            </q-expansion-item>
            <q-expansion-item
              expand-separator
              icon="people"
              label="Administradores"
              caption="Asignación de Encargados por Clasificación"    
              header-class="text-blue-10"          
              group="somegroup"
              popup
            >
              <q-card class="my-card">
                <q-card-section>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>
        </q-card-section>
        <q-card-section class="row justify-center">
          <q-btn color="primary" icon="refresh" label="Volver a Cargar las Encuestas" no-caps @click="getCollectors()" />
        </q-card-section>

        <hr>

        <q-card-actions  align="right">
          <q-btn flat label="Ok" color="primary" no-caps @click="settings = false" />
        </q-card-actions>

      </q-card>

    </q-dialog>

  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import axios from 'axios' //'src/boot/axios'

export default defineComponent({
  //name: 'PageIndex',
  /*
  mounted() {
    console.log("Mounted") 
    this.getSurveys()
  },
*/
  setup () {

    const $q = useQuasar()

    const lastClicked = ref(-1)
    const seleccionado = ref('')
    const email = ref('')
    const settings = ref(false)

    let survey = ref(null) // Encuesta seleccionada
    let surveys = ref([])  // Encuestas actuales - API MonkeySurvey
    let collector = ref(null)
    let collectors = ref([])
    let responsesOriginal = ref([])
    let responses = ref([])
    let response = ref(null)
    let responseType = ref(null)
    let responsesBulk = ref([])
    let paginas = ref(0)
    let txtRespuesta = ref("")
    let clasificacion = ref(null)  // (Q)ueja, (S)ugerencia, (F)elicitación, (I)ndefinido
    let clasificaciones = ref([
      { id: "Q", descripcion: "Queja", color: "negative" },
      { id: "S", descripcion: "Sugerencia", color: "warning" },
      { id: "F", descripcion: "Felicitación", color: "positive" },
      { id: "I", descripcion: "Sin clasificar", color: "dark" },
    ])
    let filtro = ref("")
    let loading = ref(true)
    let progress = ref(0)

    const objClasificacion = function(clasif) {
      let letra = clasif || "I"
      return this.clasificaciones.find(i => i.id == letra)
    }

    const colorClasificacion  = function(index, arreglo) {
      let encontrado, 
          letra  = "I" // default Indefinido
      // Busco la clasificación
//      encontrado = this.responses[index].pages[0].questions.find(i => (i.id == "652656765" || i.id == "683528498") )
      encontrado = arreglo[index].pages[0].questions.find(i => (i.id == "652656765" || i.id == "683528498") )
      if (encontrado) {
        if (encontrado.answers) { // Detalle de las respuestas
          if (encontrado.answers[0].choice_id) {
            if (encontrado.answers[0].choice_id == "4494706492" || encontrado.answers[0].choice_id == "4288029398") {
              letra = "F"
            } else if (encontrado.answers[0].choice_id == "4494706493" || encontrado.answers[0].choice_id == "4288029399" ) {
              letra = "S"
            } else if (encontrado.answers[0].choice_id == "4494706494" || encontrado.answers[0].choice_id == "4288029400" ) {
              letra = "Q"
            }
          }
        }
      }
      this.clasificacion = this.objClasificacion(letra)
      // Busco el texto de la respuesta
      this.txtRespuesta = ""
//      encontrado = this.responses[index].pages[0].questions.find(i => (i.id == "683528497" || i.id == "639348685") )
      encontrado = arreglo[index].pages[0].questions.find(i => (i.id == "683528497" || i.id == "639348685") )
      if (encontrado) { // Se encontraron las respuestas
        if (encontrado.answers) { // Detalle de las respuestas
          if (encontrado.answers[0].text) {
            this.txtRespuesta = encontrado.answers[0].text
          }
        } else {
          this.txtRespuesta = "(sin respuesta)"
        }
      } else {
        this.txtRespuesta = "(sin respuesta)"
      }
      return this.clasificacion.color
    } // colorClasificacion()

    const showDetail = function(index) {
      this.response = {}
      if (this.lastClicked >= 0) {
        this.responses[this.lastClicked].active = false
      }
      this.responses[index].active = true
      this.response = this.responses[index]  // Respuesta actual (seleccionada)
      this.lastClicked = index
      this.colorClasificacion(index, this.responses)
    } // showDetail()

    const getCollectorResponsesBulk = async function() {
      let json = {}
      let results = null

      //this.$q.loading.show()
      this.loading = true
      this.responsesBulk = []

      try {
        for (let index = 1; this.paginas; index++) {
          console.log("index", index)          
          results = await this.$axios({
            method: 'get',
            url: `/api/collector-responses/${this.collector.id}`,
            params: {
              page: index,
              per_page: 100
            }
          })
console.log("results", JSON.stringify(results.data.data))          
break
        } // for para todas las paginas
      } catch (err) {
        console.log("Error en getCollectorResponsesBulk", err)
        json.result = 403
        json.msg = err
      }
this.loading = false
//this.$q.loading.hide()
    } // getCollectorResponsesBulk()


    const getResponsesBulk = async function() {      
      let resp
      let arrRespuestas = []
//      this.$q.loading.show()
      let contador = 0
      try {

        this.loading = true
        this.progress = 0

        for (let pag = this.paginas; pag > 0; pag--) {  // Recorro todas las páginas para llenar el arreglo temporal
console.log("pag", pag)
if ((++contador) > 9) {
  break
}
          this.progress = Number( ( (contador / this.paginas) * 100 ).toFixed(0) )  // q-circular-progress
/*
          resp = await this.$axios({
            method: 'get',
            url: `/api/survey-responses/${this.survey.id}`,
            params: {
              page: pag,
              per_page: 100
            }
          })
          arrRespuestas = arrRespuestas.concat(resp.data.data.data)

          for (let index = 0; index < arrRespuestas.length; index++) {  // Recorro el arreglo temporal para analizar la clasificación y agregar el color
            arrRespuestas[index].color = this.colorClasificacion(index, arrRespuestas)  // Felicitación = Verde, Sugerencia = Amarillo, Queja = Rojo, Indefinido = Gris
          }

          this.responses = arrRespuestas.sort(({ id: a }, {id: b}) => b - a) // Igualo el arreglo ordenado por ID descendente
*/

        } // for (axios)



/* (inicio) Temporal para leer 100 respuestas *********************************************************************************************************************************/
resp = await this.$axios({
  method: 'get',
  url: `/api/responses`,
  params: {}
})
arrRespuestas = await resp.data.data
for (let index = 0; index < arrRespuestas.length; index++) {  // Recorro el arreglo temporal para analizar la clasificación y agregar el color
  this.progress = Number( (((index +1) / arrRespuestas.length) * 100).toFixed(0) )
  arrRespuestas[index].color = this.colorClasificacion(index, arrRespuestas)  // Felicitación = Verde, Sugerencia = Amarillo, Queja = Rojo, Indefinido = Gris
}
console.log('progress', this.progress)
this.responses = arrRespuestas.sort(({ id: a }, {id: b}) => b - a) // Igualo el arreglo ordenado por ID descendente

/* (final) Temporal para leer 100 respuestas *********************************************************************************************************************************/

        this.responsesOriginal = this.responses
        this.loading = false

      } catch(err) {
        let error = (typeof err == 'object') ? JSON.stringify(err) : err
        console.log("Error en getResponsesBulk()", err)
        this.loading = false
        this.$q.notify({
          message: "Inconveniente detectado",
          caption: error,
          color: "negative"
        })

      }

      this.loding = false //this.$q.loading.hide()
    } // getResponsesBulk()


    const getResponses = function() {

this.getResponsesBulk()
return


      let totPaginas = 0
//      this.$q.loading.show()
      this.$axios({
        method: 'get',
        url: `/api/survey-responses/${this.survey.id}`
      }).then(resp => {
        if (resp.data.result == 200 ) {
          totPaginas = resp.data.data.total / 100
          this.paginas = ( (parseInt(totPaginas) - totPaginas) !== 0 ) ? parseInt(++totPaginas) : totPaginas
          this.getResponsesBulk()
        }
      }).catch(err => {
        this.loading = false //this.$q.loading.hide()
        console.log("error", err)
      }).finally(() => {
//        this.$q.loading.hide()
      })
    } // getResponses()

    const getCollectors = function () {
      // Busco la información de la encuesta seleccionada
      this.$q.loading.show()
      this.collector = null
      this.collectors = []
      axios({
        method: 'get',
        url: `/api/collectors/${this.survey.id}`
      }).then(resp => {
        if (resp.data.result == 200 ) {
          this.collectors = resp.data.data.data
          this.collector = this.collectors[0]
          this.getResponses()
        }
      }).catch(err => {
        console.log("error", err)
      }).finally(() => {
        this.$q.loading.hide()
      })
    } // getCollectors()

    const getSurveys = function() {
      this.loading = true //this.$q.loading.show()
      this.survey = null
      this.surveys = []
      this.$axios({
        method: 'get',
        url: '/api/surveys'
      }).then(resp => {
        if (resp.data.result == 200 ) {
          this.surveys = resp.data.data.data
          this.survey = this.surveys[0]
          this.getResponses() // this.getCollectors() antes filtraba por recolector, queda como opción y ahora directamente se va a las respuestas por encuesta
        }
      }).catch(err => {
        console.log("error", err)
      }).finally(() => {
//        this.$q.loading.hide()
      })
    } // getSurveys()

    const filtrar = function() {
      // Elimino los posibles seleccionados
      this.responses = this.responses.map(i => i.active = false)
      this.response = {}
      this.lastClicked = -1

      // Cuando el filtro de búsqueda está limpio el arreglo de respuestas queda como el arreglo original
      if (this.filtro == undefined || this.filtro.length == 0) {
        this.responses = this.responsesOriginal
      } else {
        this.responses = this.responsesOriginal.filter(i => (
            i.custom_value.includes(this.filtro) || 
            i.first_name.includes(this.filtro) ||
            i.last_name.includes(this.filtro) 
          ) 
        )        
      }

    }

    return {
      seleccionado, 
      lastClicked,
      email,
      settings, 
      survey,
      surveys,
      collector,
      collectors,
      responsesOriginal,
      responses,
      response,
      responseType,
      responsesBulk,
      paginas,
      txtRespuesta,
      clasificacion,
      clasificaciones,
      getCollectors,
      getSurveys,
      getResponsesBulk,
      getResponses,
      getCollectorResponsesBulk,
      showDetail,
      objClasificacion,
      colorClasificacion,
      filtro,
      filtrar,
      loading,
      progress,
    }  // return setup()    

  }, // setup()

  mounted() {    
    this.getSurveys() // Obtengo todas las encuestas y asigno la primera por default a this.survey
  },

/*
  methods: {
    mySurveys(txt) {
console.log("mySurveys", txt, this.survey, this.surveys)
      this.$q.loading.show()
      this.$axios({
        url: '/api/surveys',
        method: 'get'
      }).then(resp => {
        console.log("resp", resp)
        this.surveys = resp.data.data.data
      }).catch(err => {
        console.log("Error", err)
      }).finally(() => {
        this.$q.loading.hide()
        console.log("Fin...")
      })
    },
  },
*/

}) // Export default
</script>
<style lang="sass">
  .contenedor
    display: flex
    height: calc(100vh - 50px) 
    border: 1px solid #e3e3e3

  .encuestas
    background: #2b2b2b //#3b3b3b
    flex: 0 0 300px
    overflow-y: auto

  .detalle
    color: white
    background: #242424 //#555555
    flex: 1
    overflow-y: auto

  /* width */
  .barra::-webkit-scrollbar 
    width: 8px

  /* Track */
  .barra::-webkit-scrollbar-track 
    background: #D8D8D8 //grey

  /* Handle */
  .barra::-webkit-scrollbar-thumb 
    background: #A4A4A4 // #37474F //#455A64
    border-radius: 10px

  /* Handle on hover */
  .barra::-webkit-scrollbar-thumb:hover 
    background: #084B8A //#37474F

  .activo
    color: white
    background: #0a0a0a //#111111 // #1b1b1b //#242424 // #5f5f5f //#31CCEC //#26A69A //#1976D2

  .titulo
    font-weight: bold
    font-style: italic
    padding-right: 5px

</style>

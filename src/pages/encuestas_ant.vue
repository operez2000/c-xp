<template>
  <q-page>
    <q-bar dark class="bg-primary text-white">
      <q-btn
        flat
        round
        icon="refresh"
        dark
        :loading="loaders.surveys"
        @click="getResponsesBulk()"
      >
        <q-tooltip>Actualizar Encuestas</q-tooltip>
      </q-btn>

      <q-btn
        flat
        round
        icon="mdi-file-excel"
        color="white"
        :loading="loaders.excel"
        @click="excel()"
      >
        <q-tooltip>Generar archivo en Excel</q-tooltip>
      </q-btn>

      <q-btn
        flat
        round
        icon="today"
        color="yellow"
        @click="dialogoFechas = true"
      >
        <q-tooltip>Rango de Fechas</q-tooltip>
      </q-btn>

      <!-- Filtro por clasificación -->
      <q-select
        v-model="filtroClasificacion"
        :options="filtrosClasificacion"
        label="Clasificaciones"
        class="q-ml-md"
        filled
        dark
        color="info"
        dense
        options-dense
        style="width: 190px"
        @update:model-value="getResponsesBulk()"
      >
        <template v-slot:prepend>
          <q-icon name="filter_alt" dark />
        </template>
      </q-select>

      <!-- Filtro por Sucursal -->
      <q-select
        v-model="sucursal"
        class="q-ml-sm"
        :options="sucursales"
        label="Sucursales"
        dark
        color="info"
        filled
        dense
        style="width: 190px"
        options-dense
        @update:model-value="getResponsesBulk()"
      >
        <template v-slot:prepend>
          <q-icon name="mdi-office-building" />
        </template>
        <q-tooltip anchor="top left">Filtrar por Sucursal</q-tooltip>
      </q-select>

      <q-space />

      <q-input
        v-model="txtFiltro"
        dark
        dense
        borderless
        placeholder="Buscar"
        class="q-mr-none q-pr-none qx-none qy-none"
        style="max-width: 300px"
        @update:model-value="inputFilter()"
      >
        <template v-slot:append>
          <q-icon v-if="txtFiltro === ''" name="search" />
          <q-icon
            v-else
            name="clear"
            class="cursor-pointer"
            @click="
              txtFiltro = '';
              inputFilter();
            "
          />
        </template>
      </q-input>

      <!-- <div class="col text-center text-weight-bold">My-App</div> -->
    </q-bar>

    <div class="contenedor">
      <div class="encuestas barra">
        <div class="q-ma-sm" v-show="false">
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
        <!-- Despliegue de encuestas -->
        <q-list class="q-mt-xs" separator dark dense>
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
              <q-avatar
                size="md"
                style="color: white"
                :color="response.color"
                dense
              >
                {{
                  response.first_name.substr(0, 1) +
                  response.last_name.substr(0, 1)
                }}
              </q-avatar>
            </q-item-section>
            <!-- Nombre del Paciente y No. de Orden -->
            <q-item-section>
              <q-item-label
                ><span style="color: white">{{
                  response.first_name + " " + response.last_name
                }}</span></q-item-label
              >
              <q-item-label caption lines="1">
                {{ response.custom_value }}
                <q-badge
                  class="q-ml-sm"
                  color="negative"
                  text-color="white"
                  label="Pend"
                  v-show="response.estatus == 'Pend'"
                />
              </q-item-label>
            </q-item-section>

            <q-item-section side top>
              <!-- <q-icon name="circle" size="small" color="white" v-show="response.active" /> -->
              <q-icon
                class="q-mt-sm"
                style="color: #4cf000"
                name="circle"
                size="small"
                v-show="response.active"
              />
              <q-item-label class="q-mt-sm" caption>{{
                index + 1
              }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
      <!-- div encuestas -->

      <div class="detalle q-pa-md barra">
        <div v-if="lastClicked >= 0">
          <!-- <div class="text-h4 q-mb-md">
            <span :class="`bg-${clasificacion.color} q-px-sm`">{{ clasificacion.descripcion }}</span>
          </div> -->

          <q-banner
            :style="response.clasificacion == 'Q' ? 'cursor: pointer;' : ''"
            :class="`bg-${clasificacion.color} q-px-sm text-h6`"
            dense
            dark
            @click="
              response.clasificacion == 'Q' ? onBannerClick(response) : null
            "
          >
            <div class="row justify-between">
              <div class="col-auto">
                <span class="text-h6">{{ clasificacion.descripcion }}</span>
              </div>
              <div class="col-auto">
                <span class="text-h6">{{ response.folioInterno }}</span>
              </div>
            </div>
          </q-banner>

          <br />
          <div class="row justify-between">
            <div class="col-auto">
              <span class="titulo">Paciente:</span>
              {{ response.first_name + " " + response.last_name }}
            </div>
            <div class="col-auto">
              Folio de Encuesta: <strong>{{ response.id }}</strong>
            </div>
          </div>
          <p></p>
          <!-- <q-separator class="q-mb-md" dark /> -->
          <p><span class="titulo">Email: </span> {{ response.email }}</p>
          <p><span class="titulo">Orden: </span> {{ response.custom_value }}</p>
          <p>
            <span class="titulo">Fecha de Orden: </span>
            {{ response.custom_value2 }}
          </p>
          <p>
            <span class="titulo">Recepcionista: </span>
            {{ response.custom_value3 }}
          </p>
          <p>
            <span class="titulo">Flebotomista: </span>
            {{ response.custom_value4 }}
          </p>
          <p>
            <span class="titulo">Sucursal: </span> {{ response.custom_value5 }}
          </p>
          <p>
            <span class="titulo">Fecha de Entrega: </span>
            {{ response.custom_value6 }}
          </p>
          <p>
            <span class="titulo">Fecha de Encuesta: </span> {{ response.fecha }}
          </p>
          <q-separator class="q-mb-md" dark />
          <p>
            <span class="titulo">Respuesta: </span> {{ response.respuesta }}
          </p>
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
        <!-- <div class="row justify-center" v-show="lastClicked < 0">
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
        </div> -->
      </div>
    </div>

    <!-- Fab button para configuraciones -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn
        fab
        size="sm"
        icon="settings"
        color="green"
        glossy
        @click="
          settings = true;
          getComites('F');
          getComites('S');
          getComites('Q');
        "
      >
        <q-tooltip> Configuraciones </q-tooltip>
      </q-btn>
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
        <hr />
        <q-card-section>
          <q-list class="rounded-borders">
            <q-expansion-item
              expand-separator
              icon="search"
              label="Parámetros de búsqueda"
              caption="Filtros"
              header-class="text-blue-10"
              group="somegroup"
              popup
              v-show="false"
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
              label="Administradores (Comité)"
              caption="Asignación de Encargados por Clasificación"
              header-class="text-blue-10"
              group="somegroup"
              popup
            >
              <q-card class="my-card">
                <q-card-section>
                  <q-tabs
                    v-model="tab"
                    class="bg-grey-3 text-primary"
                    inline-label
                    align="center"
                    dense
                  >
                    <q-tab
                      name="felicitacion"
                      icon="thumb_up_off_alt"
                      label="Felicitación"
                      no-caps
                      @click="getComites('F')"
                    />
                    <q-tab
                      name="sugerencia"
                      icon="emoji_people"
                      label="Sugerencia"
                      no-caps
                      @click="getComites('S')"
                    />
                    <q-tab
                      name="queja"
                      icon="thumb_down_off_alt"
                      label="Queja"
                      no-caps
                      @click="getComites('Q')"
                    />
                  </q-tabs>

                  <q-separator color="primary" />

                  <q-tab-panels
                    v-model="tab"
                    dense
                    animated
                    swipeable
                    transition-prev="jump-down"
                    transition-next="jump-up"
                  >
                    <!-- Comité de Felicitaciones -->
                    <q-tab-panel name="felicitacion">
                      <div class="text-h6 q-mb-md">
                        Comité de Felicitaciones
                      </div>
                      <q-select
                        v-model="comiteFelicitaciones"
                        label="Comité"
                        :options="empleados"
                        option-value="empleado_codigo"
                        option-label="nombrePaterno"
                        :loading="loadingSelect.felicitaciones"
                        use-input
                        use-chips
                        multiple
                        @filter="filterFn"
                        filled
                        dense
                        options-dense
                        clearable
                        @update:model-value="validaCorreo('F')"
                        ref="refComiteFelicitaciones"
                      >
                        <template v-slot:no-option>
                          <q-item>
                            <q-item-section class="text-grey">
                              Sin resultados
                            </q-item-section>
                          </q-item>
                        </template>
                      </q-select>
                      <div class="row justify-end q-my-md">
                        <q-btn
                          round
                          color="primary"
                          icon="check"
                          size="md"
                          glossy
                          :loading="loadingSelect.btnSave"
                          @click="onClick('FELICITACION', comiteFelicitaciones)"
                        >
                          <q-tooltip
                            >Guardar comité de Felicitaciones</q-tooltip
                          >
                        </q-btn>
                      </div>
                    </q-tab-panel>

                    <!-- Comité de sugerencias -->
                    <q-tab-panel name="sugerencia">
                      <div class="text-h6 q-mb-md">Comité de Sugerencias</div>
                      <q-select
                        v-model="comiteSugerencias"
                        label="Comité"
                        :options="empleados"
                        option-value="empleado_codigo"
                        option-label="nombrePaterno"
                        :loading="loadingSelect.sugerencias"
                        use-input
                        use-chips
                        multiple
                        @filter="filterFn"
                        filled
                        dense
                        options-dense
                        clearable
                        @update:model-value="validaCorreo('S')"
                        ref="refComiteSugerencias"
                      >
                        <template v-slot:no-option>
                          <q-item>
                            <q-item-section class="text-grey">
                              Sin resultados
                            </q-item-section>
                          </q-item>
                        </template>
                      </q-select>
                      <div class="row justify-end q-my-md">
                        <q-btn
                          round
                          color="primary"
                          icon="check"
                          size="md"
                          glossy
                          :loading="loadingSelect.btnSave"
                          @click="onClick('SUGERENCIA', comiteSugerencias)"
                        >
                          <q-tooltip>Guardar comité de Sugerencias</q-tooltip>
                        </q-btn>
                      </div>
                    </q-tab-panel>

                    <!-- Comité de quejas -->
                    <q-tab-panel name="queja">
                      <div class="text-h6 q-mb-md">Comité de Quejas</div>
                      <q-select
                        v-model="comiteQuejas"
                        label="Comité"
                        :options="empleados"
                        option-value="empleado_codigo"
                        option-label="nombrePaterno"
                        :loading="loadingSelect.quejas"
                        use-input
                        use-chips
                        multiple
                        @filter="filterFn"
                        filled
                        dense
                        options-dense
                        clearable
                        @update:model-value="validaCorreo('Q')"
                        ref="refComiteQuejas"
                      >
                        <template v-slot:no-option>
                          <q-item>
                            <q-item-section class="text-grey">
                              Sin resultados
                            </q-item-section>
                          </q-item>
                        </template>
                      </q-select>
                      <div class="row justify-end q-my-md">
                        <q-btn
                          round
                          color="primary"
                          icon="check"
                          size="md"
                          glossy
                          :loading="loadingSelect.btnSave"
                          @click="onClick('QUEJA', comiteQuejas)"
                        >
                          <q-tooltip>Guardar comité de Quejas</q-tooltip>
                        </q-btn>
                      </div>
                    </q-tab-panel>
                  </q-tab-panels>
                </q-card-section>
              </q-card>
            </q-expansion-item>
          </q-list>
        </q-card-section>
        <q-card-section class="row justify-center">
          <q-btn
            color="primary"
            icon="refresh"
            label="Volver a Cargar las Encuestas"
            :loading="loadingCargarEncuestas"
            no-caps
            @click="getResponsesBulk()"
          />
        </q-card-section>

        <hr />

        <q-card-actions align="right">
          <q-btn
            flat
            label="Ok"
            color="primary"
            no-caps
            @click="settings = false"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialogo de Rango de Fechas para filtrar las encuestas -->
    <q-dialog v-model="dialogoFechas" @hide="onHide()">
      <q-card style="max-width: 630px">
        <q-bar class="bg-primary text-white">
          <q-icon name="today" />
          <div>Filtro por Rango de Fechas</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup>
            <q-tooltip class="bg-white text-primary">Close</q-tooltip>
          </q-btn>
        </q-bar>

        <q-card-section>
          <div class="row">
            <div class="col q-ml-none q-mr-md">
              <q-date
                v-model="fechas.desde"
                mask="YYYY-MM-DD"
                :options="optionsFn"
              />
            </div>
            <div class="col">
              <q-date
                v-model="fechas.hasta"
                mask="YYYY-MM-DD"
                :options="optionsFn"
              />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            label="Continuar"
            color="primary"
            no-caps
            v-close-popup
            @click="getResponsesBulk()"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialogo para categorizar la queja y tabs de seguimiento -->
    <q-dialog v-model="dialogoQueja">
      <q-card class="bg-blue-grey-2" style="width: 420px; max-width: 420px">
        <q-card-section class="row items-center">
          <q-avatar icon="directions_walk" color="primary" text-color="white" />
          <span class="q-ml-sm text-h6">Seguimiento...</span>
        </q-card-section>
        <q-card-section>
          <div class="row">
            <div class="col">
              <q-select
                v-model="motivoQueja"
                :options="motivosQuejas"
                option-value="id"
                option-label="nombre"
                label="(Categoría)"
                stack-label
                filled
                dense
                options-dense
                @update:model-value="onSelectCategorias(response)"
                :loading="loaders.categorias"
                style="min-width: 250px; max-width: 300px"
              />
            </div>
          </div>
        </q-card-section>
        <q-card-section>
          <div class="row">
            <div class="col">
              <q-select
                v-model="responsable"
                :options="responsables"
                option-value="id"
                option-label="nombre"
                label="(Responsable)"
                stack-label
                filled
                dense
                options-dense
                @update:model-value="onSelectResponsable(response)"
                :loading="loaders.responsables"
                style="min-width: 250px; max-width: 300px;"
              >
                <template v-slot:after>
                  <q-btn color="primary" icon="send" round dense @click="onSendClick" :disable="responsable == null" />
                </template>
              </q-select>
            </div>
          </div>
        </q-card-section>
        <q-separator inset />
        <q-card-section>
          <div class="row items-left">
            <q-tabs
              v-model="tab"
              class="text-primary"
            >
              <q-tab name="investigacion" icon="person_search" label="Investigación" no-caps />
              <q-tab name="paciente" icon="mail" label="Paciente" no-caps />
              <q-tab name="accion" icon="playlist_add_check_circle" label="Acciones (Cierre)" no-caps />

              <q-tab-panels
                v-model="tab"
                animated
                swipeable
                transition-prev="jump-up"
                transition-next="jump-up"
              >
                <q-tab-panel name="investigacion">
                  <div class="text-h4 q-mb-md">Mails</div>
                  <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quis praesentium cumque magnam odio iure quidem, quod illum numquam possimus obcaecati commodi minima assumenda consectetur culpa fuga nulla ullam. In, libero.</p>
                  <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quis praesentium cumque magnam odio iure quidem, quod illum numquam possimus obcaecati commodi minima assumenda consectetur culpa fuga nulla ullam. In, libero.</p>
                </q-tab-panel>

                <q-tab-panel name="paciente">
                  <div class="text-h4 q-mb-md">Alarms</div>
                  <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quis praesentium cumque magnam odio iure quidem, quod illum numquam possimus obcaecati commodi minima assumenda consectetur culpa fuga nulla ullam. In, libero.</p>
                  <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quis praesentium cumque magnam odio iure quidem, quod illum numquam possimus obcaecati commodi minima assumenda consectetur culpa fuga nulla ullam. In, libero.</p>
                </q-tab-panel>

                <q-tab-panel name="accion">
                  <div class="text-h4 q-mb-md">Movies</div>
                  <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quis praesentium cumque magnam odio iure quidem, quod illum numquam possimus obcaecati commodi minima assumenda consectetur culpa fuga nulla ullam. In, libero.</p>
                  <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quis praesentium cumque magnam odio iure quidem, quod illum numquam possimus obcaecati commodi minima assumenda consectetur culpa fuga nulla ullam. In, libero.</p>
                  <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Quis praesentium cumque magnam odio iure quidem, quod illum numquam possimus obcaecati commodi minima assumenda consectetur culpa fuga nulla ullam. In, libero.</p>
                </q-tab-panel>
              </q-tab-panels>



            </q-tabs>
          </div>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right">
          <q-btn class="full-width bg-primary text-white" flat label="Regresar" no-caps v-close-popup />
          <!-- <q-btn flat label="Turn on Wifi" color="primary" v-close-popup no-caps /> -->
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { defineComponent, ref, onMounted } from "vue";
import { useQuasar } from "quasar";
import axios from "axios"; //'src/boot/axios'
import XLSX from "xlsx";
import Utils from "../assets/utils";

export default defineComponent({
  //name: 'PageIndex',

  /*
  mounted() {
    console.log("Mounted", process.env)
//    this.getSurveys()
  },
*/

  setup() {
    const $q = useQuasar();

    const lastClicked = ref(-1);
    const seleccionado = ref("");
    const email = ref("");
    const settings = ref(false);

    let survey = ref(null); // Encuesta seleccionada
    let surveys = ref([]); // Encuestas actuales - API MonkeySurvey
    let collector = ref(null);
    let collectors = ref([]);
    let responsesOriginal = ref([]);
    let responses = ref([]);
    let response = ref(null);
    let responseType = ref(null);
    let responsesBulk = ref([]);
    let paginas = ref(0);
    let txtRespuesta = ref("");
    let clasificacion = ref(null); // (Q)ueja, (S)ugerencia, (F)elicitación, (I)ndefinido
    let clasificaciones = ref([
      { id: "Q", descripcion: "Queja", color: "negative" },
      { id: "S", descripcion: "Sugerencia", color: "warning" },
      { id: "F", descripcion: "Felicitación", color: "positive" },
      { id: "I", descripcion: "Sin clasificar", color: "dark" },
    ]);
    let filtro = ref("");
    let loading = ref(true);
    let progress = ref(0);
    let tab = ref("felicitacion");
    let comites = ref([]);
    let comiteFelicitaciones = ref(null);
    let comiteSugerencias = ref(null);
    let comiteQuejas = ref(null);
    let empleadosOriginal = ref([]);
    let empleados = ref([]);
    let loadingSelect = ref({
      felicitaciones: false,
      sugerencias: false,
      quejas: false,
      btnSave: false,
    });
    let loadingCargarEncuestas = ref(false);
    let rango = ref({
      fechaInicial: "",
      fechaFinal: "",
    });

    const objClasificacion = function (clasif) {
      let letra = clasif || "I";
      return this.clasificaciones.find((i) => i.id == letra);
    };

    const colorClasificacion = function (index, arreglo) {
      let encontrado,
        letra = "I"; // default Indefinido
      // Busco la clasificación
      //      encontrado = this.responses[index].pages[0].questions.find(i => (i.id == "652656765" || i.id == "683528498") )
      encontrado = arreglo[index].pages[0].questions.find(
        (i) => i.id == "652656765" || i.id == "683528498"
      );
      if (encontrado) {
        if (encontrado.answers) {
          // Detalle de las respuestas
          if (encontrado.answers[0].choice_id) {
            if (
              encontrado.answers[0].choice_id == "4494706492" ||
              encontrado.answers[0].choice_id == "4288029398"
            ) {
              letra = "F";
            } else if (
              encontrado.answers[0].choice_id == "4494706493" ||
              encontrado.answers[0].choice_id == "4288029399"
            ) {
              letra = "S";
            } else if (
              encontrado.answers[0].choice_id == "4494706494" ||
              encontrado.answers[0].choice_id == "4288029400"
            ) {
              letra = "Q";
            }
          }
        }
      }
      this.clasificacion = this.objClasificacion(letra);
      // Busco el texto de la respuesta
      this.txtRespuesta = "";
      encontrado = arreglo[index].pages[0].questions.find(
        (i) => i.id == "683528497" || i.id == "639348685"
      );
      if (encontrado) {
        // Se encontraron las respuestas
        if (encontrado.answers) {
          // Detalle de las respuestas
          if (encontrado.answers[0].text) {
            this.txtRespuesta = encontrado.answers[0].text;
          }
        } else {
          this.txtRespuesta = "(sin respuesta)";
        }
      } else {
        this.txtRespuesta = "(sin respuesta)";
      }
      return this.clasificacion.color;
    }; // colorClasificacion()

    const showDetail = function (index) {
      this.response = {};
      if (this.lastClicked >= 0) {
        this.responses[this.lastClicked].active = false;
      }
      this.responses[index].active = true;
      this.response = this.responses[index]; // Respuesta actual (seleccionada)
      this.lastClicked = index;
      this.clasificacion = this.clasificaciones.find(
        (v) => v.id == this.response.clasificacion
      );
      //this.colorClasificacion(index, this.responses)
    }; // showDetail()

    const getCollectorResponsesBulk = async function () {
      let json = {};
      let results = null;
      this.loading = true;
      this.responsesBulk = [];
      try {
        for (let index = 1; this.paginas; index++) {
          console.log("index", index);
          results = await this.$axios({
            method: "get",
            url: `/api/collector-responses/${this.collector.id}`,
            params: {
              page: index,
              per_page: 100,
            },
          });
        } // for para todas las paginas
      } catch (err) {
        console.log("Error en getCollectorResponsesBulk", err);
        json.result = 403;
        json.msg = err;
      } finally {
        this.loading = false;
      }
    }; // getCollectorResponsesBulk()

    const getResponsesBulk = async function () {
      this.$q.loading.show({
        message: "Leyendo encuestas...",
      });
      this.loadingCargarEncuestas = true;
      this.loaders.surveys = true;
      this.$axios({
        method: "get",
        url: `/api/responses`,
        params: {
          desde: this.fechas.desde,
          hasta: this.fechas.hasta,
          nombreSucursal: this.sucursal,
          clasificacion: this.filtroClasificacion,
        },
      })
        .then((resp) => {
          this.responsesOriginal = resp.data.data;
          this.responses = this.responsesOriginal;
          this.rango = resp.data.rango; // fechaInicial y fechaFinal para mostrar en diálogo de fechas
        })
        .catch((err) => {
          console.log("error", err);
          let txtErr = typeof err == "object" ? JSON.stringify(err) : err;
          this.$q.loading.hide();
          this.$q.notify({
            message:
              "No se ha podido leer la información desde la Base de Datos",
            caption: txtErr,
          });
        })
        .finally(() => {
          this.$q.loading.hide();
          this.loading = false;
          this.loadingCargarEncuestas = false;
          this.loaders.surveys = false;
        });
    }; // getResponsesBulk()

    const getResponses = function () {
      let totPaginas = 0;
      this.$q.loading.show();
      this.$axios({
        method: "get",
        url: `/api/responses`,
      })
        .then((resp) => {
          if (resp.data.result == 200) {
            totPaginas = resp.data.data.total / 100;
            this.paginas =
              parseInt(totPaginas) - totPaginas !== 0
                ? parseInt(++totPaginas)
                : totPaginas;
            this.getResponsesBulk();
          }
        })
        .catch((err) => {
          console.log("error", err);
          let txtErr = typeof err == "object" ? JSON.stringify(err) : err;
          this.$q.loading.hide();
          this.$q.notify({
            message:
              "No se ha podido leer la informaci'on desde la Base de Datos",
            caption: txtErr,
          });
        })
        .finally(() => {
          this.$q.loading.hide();
        });
    }; // getResponses() ************************************************************************************************************************

    const getCollectors = function () {
      // Busco la información de la encuesta seleccionada
      this.$q.loading.show();
      this.collector = null;
      this.collectors = [];
      axios({
        method: "get",
        url: `/api/collectors/${this.survey.id}`,
      })
        .then((resp) => {
          if (resp.data.result == 200) {
            this.collectors = resp.data.data.data;
            this.collector = this.collectors[0];
            this.getResponses();
          }
        })
        .catch((err) => {
          console.log("error", err);
        })
        .finally(() => {
          this.$q.loading.hide();
        });
    }; // getCollectors()

    const getSurveys = function () {
      this.loading = true; //this.$q.loading.show()
      this.survey = null;
      this.surveys = [];
      this.$axios({
        method: "get",
        url: "/api/surveys",
      })
        .then((resp) => {
          if (resp.data.result == 200) {
            this.surveys = resp.data.data.data;
            this.survey = this.surveys[0];
            this.getResponses(); // this.getCollectors() antes filtraba por recolector, queda como opción y ahora directamente se va a las respuestas por encuesta
          }
        })
        .catch((err) => {
          console.log("error", err);
        })
        .finally(() => {
          //        this.$q.loading.hide()
        });
    }; // getSurveys()

    const filtrar = function (origen = "INPUT", tipo = "T") {
      console.log("filtrar()", tipo);
      // Elimino los posibles seleccionados
      this.responses = this.responses.map((i) => (i.active = false));
      this.response = {};
      this.lastClicked = -1;

      // Cuando el filtro de búsqueda está limpio el arreglo de respuestas queda como el arreglo original
      if (origen == "INPUT") {
        // filtro por qInput (MainLayout)
        if (
          this.filtro == undefined ||
          this.filtro.length == 0 ||
          this.filtro == null
        ) {
          this.responses = this.responsesOriginal;
        } else {
          this.responses = this.responsesOriginal.filter(
            (i) =>
              i.custom_value
                .toUpperCase()
                .includes(this.filtro.toUpperCase()) ||
              i.first_name.toUpperCase().includes(this.filtro.toUpperCase()) ||
              i.last_name.toUpperCase().includes(this.filtro.toUpperCase()) ||
              i.id.toUpperCase().includes(this.filtro.toUpperCase())
          );
        }
      } else if (origen == "SELECT") {
        // Filtro qSelect (MainLayout)
        if (tipo == "T") {
          this.responses = this.responsesOriginal;
        } else {
          this.responses = this.responsesOriginal.filter(
            (i) => i.clasificacion == tipo
          );
        }
      } else if (origen == "FECHAS") {
        // Filtro fechas qDate en diálogo (MainLayout)
        this.responses = this.responsesOriginal.filter(
          (v) =>
            v.fecha.substr(0, 10) >= this.fechas.desde &&
            v.fecha.substr(0, 10) <= this.fechas.hasta
        );
      } else if (origen == "SUCURSAL") {
        this.$q.loading.show("Filtrando");
        this.responses =
          tipo == "- Todas -"
            ? this.responsesOriginal
            : this.responsesOriginal.filter((v) => v.custom_value5 == tipo);
      }

      this.$q.loading.hide();
    }; // filtrar()

    const getEmpleados = function () {
      this.loadingSelect.felicitaciones = true;
      this.loadingSelect.sugerencias = true;
      this.loadingSelect.quejas = true;
      this.empleados = [];
      this.$axios({
        method: "get",
        url: `http://icertus.com.mx:84/rh/servidor/svr_empleados.php/?o=select&nombre_apellidos=`,
      })
        .then((resp) => {
          if (resp.status == 200 && resp.data.empleados != undefined) {
            this.empleadosOriginal = resp.data.empleados;
            this.empleados = resp.data.empleados;
          } else {
            this.$q.notify({
              message: "Se detectó un inconveniente con el servidor de RH",
              caption: "Favor de reportar a Desarrollo (TI)",
            });
          }
        })
        .catch((err) => {
          let txtError = typeof err == "object" ? JSON.stringify(err) : err;
          this.$q.notify({
            message: "Se detectó un inconveniente: " + txtError,
            caption: "Favor de reportar a Desarrollo (TI)",
          });
        })
        .finally(() => {
          this.loadingSelect.felicitaciones = false;
          this.loadingSelect.sugerencias = false;
          this.loadingSelect.quejas = false;
        });
    }; // getEmpleados()

    const filterFn = function (val, update, abort) {
      if (val == undefined || val === "") {
        try {
          update(() => {
            empleados.value = empleadosOriginal.value;
            // here you have access to "ref" which
            // is the Vue reference of the QSelect
          });
        } catch (err) {
          console.log("Error en update filterFn", err);
        }
        return;
      }

      try {
        update(() => {
          empleados.value = empleadosOriginal.value.filter((v) =>
            v.nombrePaterno.toLowerCase().includes(val.toLowerCase())
          );
        });
      } catch (err) {
        console.log("Error en update filterFn", err);
      }
    }; // filterFn()

    const validaCorreo = function (comite) {
      let found;
      if (comite == "F") {
        console.log("f", this.comiteFelicitaciones);
        found = this.comiteFelicitaciones.find(
          (v) =>
            v.correo_empresa == undefined ||
            v.correo_empresa == "undefined" ||
            v.correo_empresa == ""
        );
        if (found) {
          // Elimino el trabajador que se selecciona sin correo
          this.comiteFelicitaciones = this.comiteFelicitaciones.filter(
            (v) =>
              v.correo_empresa != undefined &&
              v.correo_empresa != "undefined" &&
              v.correo_empresa != ""
          );
        }
      } else if (comite == "S") {
        found = this.comiteSugerencias.find(
          (v) =>
            v.correo_empresa == undefined ||
            v.correo_empresa == "undefined" ||
            v.correo_empresa == ""
        );
        if (found) {
          // Elimino el trabajador que se selecciona sin correo
          this.comiteSugerencias = this.comiteSugerencias.filter(
            (v) =>
              v.correo_empresa != undefined &&
              v.correo_empresa != "undefined" &&
              v.correo_empresa != ""
          );
        }
      } else if (comite == "Q") {
        console.log("q", this.comiteQuejas);
        found = this.comiteQuejas.find(
          (v) =>
            v.correo_empresa == undefined ||
            v.correo_empresa == "undefined" ||
            v.correo_empresa == ""
        );
        if (found) {
          // Elimino el trabajador que se selecciona sin correo
          this.comiteQuejas = this.comiteQuejas.filter(
            (v) =>
              v.correo_empresa != undefined &&
              v.correo_empresa != "undefined" &&
              v.correo_empresa != ""
          );
        }
      }

      if (found) {
        this.$q.notify({
          message: "El Colaborador no tiene asignada una Cuenta de Correo",
          caption: "Favor de notificar a las áreas de RH y a TI",
          color: "orange-9",
        });
      }
    }; // validaCorreo()

    // Se limpia el valor buscado en el qSelect múltiple - autocomplete
    const clearInputValue = function (comite) {
      // Limpiar el input al seleccionar un item - autocomplete
      try {
        if (comite == "F") {
          //          this.$refs.refComiteFelicitaciones.updateInputValue("")
        } else if (comite == "S" && this.$refs.refComiteSugerencias) {
          this.$refs.refComiteSugerencias.updateInputValue("");
        } else if (comite == "Q") {
          //          this.$refs.refComiteQuejas.updateInputValue("")
        }
      } catch (error) {
        console.log("Error en clearInputValue()", err);
      }
    }; // clearInputValue()

    const onClick = function (origen, comite) {
      this.loadingSelect.btnSave = true;
      this.$axios({
        method: "post",
        url: `/api/comite/${origen.substr(0, 1)}`,
        data: {
          comite: comite.map(({ empleado_codigo }) => ({ empleado_codigo })),
        },
      })
        .then((resp) => {
          console.log("resp", resp.data);
          if (resp.data.result == 200) {
            this.$q.notify({
              message: "Cambios realizados correctamente",
              color: "positive",
            });
          }
        })
        .catch((err) => {
          let txtError = typeof err == "object" ? JSON.stringify(err) : err;
          this.loading = false;
          this.$q.notify({
            message: "Inconveniente detectado",
            caption: txtError,
            color: "negative",
            timeout: 6000,
          });
        })
        .finally(() => {
          this.loadingSelect.btnSave = false;
        });
    }; // onClick()

    const getComites = function (clasificacion) {
      this.loadingSelect.felicitaciones = true;
      this.loadingSelect.sugerencias = true;
      this.loadingSelect.quejas = true;

      this.$axios({
        method: "get",
        url: `/api/comites/${clasificacion}`,
      })
        .then((resp) => {
          if (resp.data.result == 200) {
            if (clasificacion == "F") {
              this.comiteFelicitaciones = resp.data.empleados.filter((x) =>
                resp.data.results.find(
                  (y) => y.representante == x.empleado_codigo
                )
              );
              this.comites.felicitaciones = this.comiteFelicitaciones;
            } else if (clasificacion == "S") {
              this.comiteSugerencias = resp.data.empleados.filter((x) =>
                resp.data.results.find(
                  (y) => y.representante == x.empleado_codigo
                )
              );
              this.comites.sugerencias = this.comiteSugerencias;
            } else if (clasificacion == "Q") {
              this.comiteQuejas = resp.data.empleados.filter((x) =>
                resp.data.results.find(
                  (y) => y.representante == x.empleado_codigo
                )
              );
              this.comites.quejas = this.comiteQuejas;
            }
          } else {
            this.$q.notify({
              message: "Se detectó un inconveniente con el servidor",
              caption: "No se han podído leer los Comités por Clasificación",
            });
          }
        })
        .catch((err) => {
          this.$q.notify({
            message: "Se detectó un inconveniente con el servidor",
            caption: typeof err == "object" ? JSON.stringify(err) : err,
          });
        })
        .finally(() => {
          this.loadingSelect.felicitaciones = false;
          this.loadingSelect.sugerencias = false;
          this.loadingSelect.quejas = false;
        });
    }; // getComites()

    const cambio = function (objeto) {}; // cambio()

    const excel = function () {
      this.loaders.excel = true;
      let mapItems = this.responses.map(
        ({
          survey_id,
          id,
          collector_id,
          custom_value,
          custom_value2,
          custom_value3,
          custom_value4,
          custom_value5,
          custom_value6,
          nombreCompletoPaciente,
          email,
          clasificacion,
          respuesta,
          fecha,
        }) => ({
          survey_id,
          id,
          collector_id,
          custom_value,
          custom_value2,
          custom_value3,
          custom_value4,
          custom_value5,
          custom_value6,
          nombreCompletoPaciente,
          email,
          clasificacion,
          respuesta,
          fecha,
        })
      );
      let ws = XLSX.utils.json_to_sheet(mapItems);
      // Agregar al libro
      let wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Registros");
      let arrCols = Object.keys(mapItems[0]); // Columnas (de objeto a arreglo)
      // Ancho de las columnas
      let wscols = [
        { wch: 9 }, // survey_id
        { wch: 12 }, // id (encuesta)
        { wch: 12 }, // collector_id
        { wch: 14 }, // custom_value (orden)
        { wch: 15 }, // custom_value2 (fecha/hora orden)
        { wch: 40 }, // custom_value3 (recepcionista)
        { wch: 40 }, // custom_value4 (flebotomista)
        { wch: 17 }, // custom_value5 (sucursal)
        { wch: 15 }, // custom_value6 (fecha/hora entrega)
        { wch: 40 }, // nombreCompletoPaciente
        { wch: 40 }, // email
        { wch: 5 }, // clasificacion
        { wch: 60 }, // respuesta
        { wch: 15 }, // fecha (fecha hora encuesta)
      ];
      ws["!cols"] = wscols;
      // examens de los encabezados
      ws["A1"].v = "# Encuesta";
      ws["B1"].v = "# Respuesta";
      ws["C1"].v = "# Recolector";
      ws["D1"].v = "# Orden";
      ws["E1"].v = "Fecha Orden";
      ws["F1"].v = "Recepcionista";
      ws["G1"].v = "Flebotomista";
      ws["H1"].v = "Sucursal";
      ws["I1"].v = "Fecha Entrega Result";
      ws["J1"].v = "Nombre del Paciente";
      ws["K1"].v = "Email";
      ws["L1"].v = "Clasif";
      ws["M1"].v = "Respuesta";
      ws["N1"].v = "Fecha Encuesta";
      // Descargar archivo
      XLSX.writeFile(wb, `Reporte de Encuestas.xlsx`);
      this.loaders.excel = false; //this.$store.commit("example/mutGeneraExcel", false);
    };

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
      tab,
      comiteFelicitaciones,
      comiteSugerencias,
      getEmpleados,
      getComites,
      comites,
      comiteQuejas,
      empleados,
      empleadosOriginal,
      loadingSelect,
      loadingCargarEncuestas,
      filterFn,
      cambio,
      onClick,
      clearInputValue,
      validaCorreo,
      dialogoFechas: ref(false),
      filtrarPorFechas: ref(null),
      fechas: ref({
        desde: new Date().toLocaleDateString("en-CA"),
        hasta: new Date().toLocaleDateString("en-CA"),
      }),
      onHide() {
        // al cerrar el díalogo de fechas afecto con falso a state.dlgFechas
        this.$store.commit("example/mutDlgFechas", false);
      },
      rango,
      optionsFn(date) {
        // Validar que la fecha no sea anterior al primer registro/encuesta ni mayor al último (/api/responses)
        return (
          date.replace(/\//g, "-") >= rango.value.fechaInicial &&
          date.replace(/\//g, "-") <= rango.value.fechaFinal
        );
      },
      excel,
      loaders: ref({
        surveys: false,
        excel: false,
        categorias: false,
        responsables: false,
      }),
      filtrosClasificacion: ref([
        "Todas",
        "Felicitaciones",
        "Sugerencias",
        "Quejas",
      ]),
      filtroClasificacion: ref(null),
      filtroSeleccionado(item) {
        // Solo la primera letra (F, S, Q)
        $q.loading.show("Filtrando");
        this.filtrar("SELECT", item.substr(0, 1)); // origen qSelect, letra de la opción seleccionada
      },
      sucursal: ref(null),
      sucursales: ref([]),
      filtroSucursal(item) {
        filtrar("SUCURSAL", item);
      },
      txtFiltro: ref(""),
      inputFilter() {
        this.filtro = this.txtFiltro;
        this.filtrar("INPUT");
      },
      motivoQueja: ref(null),
      motivosQuejas: ref([]),
      responsable: ref(null),
      responsables: ref([]),
      async onBannerClick(item) {
        //console.log(item)
        this.dialogoQueja = true;
        if (item.idMotivo != "" && item.idMotivo != null) {
          let index = this.motivosQuejas.findIndex(
            (v) => v.id == item.idMotivo
          );
          if (index >= 0) {
            this.motivoQueja = this.motivosQuejas[index];
          }
        } else {
          this.motivoQueja = null;
        }

        try {
          // Responsables
          let results = await this.$axios({
            method: "GET",
            url: "/api/responsables",
          });
          this.responsables = await results.data.data;
          let find = this.responses.find(v => v == item)
          this.responsable = this.responsables.find(v => v.id == find.idResponsable)
        } catch (error) {
          conosle.log("Error", error)
          this.$q.notify({
            message: `<p>Se detectó un inconveniente</p><pre>${error}</pre>`,
            html: true,
          })
        } finally {
        }
      }, // onBannerClick()
      dialogoQueja: ref(false),
      onSelectCategorias(item) {
        console.log("item", item);
        console.log("categoria", this.motivoQueja);
        this.loaders.categorias = true;
        this.$axios({
          method: "post",
          url: `/api/encuesta/categoria/${item.id}`,
          data: {
            idMotivo: this.motivoQueja.id,
          },
        }).then((resp) => {
          console.log("resp", resp.data);
          if (resp.data.result == 200) {
            let index = this.responses.findIndex((v) => v.id == item.id);
            if (index >= 0) {
              this.responses[index].idMotivo = this.motivoQueja.id;
              this.responses[index].estatus = "";
            }
          }
        }).catch((error) => {
          console.log("error", error);
        }).finally(() => {
          this.loaders.categorias = false;
        });
      }, // onSelectCategorias()
      onSelectResponsable(item) {
        console.log("item", item);
        console.log("responsable", this.responsable);
        this.loaders.responsables = true;
        this.$axios({
          method: "post",
          url: `/api/encuesta/responsable/${item.id}`,
          data: {
            idResponsable: this.responsable.id,
          },
        }).then((resp) => {
          console.log("resp", resp.data);
          if (resp.data.result == 200) {
            let index = this.responses.findIndex((v) => v.id == item.id);
            if (index >= 0) {
              this.responses[index].idResponsable = this.responsable.id;
//              this.responses[index].estatus = "";
            }
          }
        }).catch((error) => {
          console.log("error", error);
        }).finally(() => {
          this.loaders.responsables = false;
        });
      }, // onSelectResponsable()
      onSendClick(item) {
console.log("Send...;", item)
      },
      tabs: [
        { name: "investigacion", label: "Investigación" },
        { name: "paciente", label: "Paciente" },
        { name: "accion", label: "Acción" },
      ],
      tab: ref('investigacion'),
      utils: ref(new Utils()),
    }; // return setup()
  }, // setup()

  mounted() {
    this.fechas.desde = this.utils
      .addDays(new Date(), -30)
      .toLocaleDateString("en-CA"); // 30 días antes  default
    this.getResponsesBulk(); //this.getSurveys() // Obtengo todas las encuestas y asigno la primera por default a this.survey
    this.getEmpleados();
    this.filtroClasificacion = this.filtrosClasificacion[0];
    // Sucursales
    this.$axios({
      url: "/api/sucursales",
      method: "get",
    })
      .then((resp) => {
        this.sucursales = resp.data.data;
        this.sucursal = this.sucursales[0];
      })
      .catch((error) => {
        console.log("Error /api/sucursales", error);
      })
      .finally(() => {});
    // Motivos de quejas
    this.$axios({
      url: "/api/categorias/quejas",
      method: "get",
    })
      .then((resp) => {
        this.motivosQuejas = resp.data.data;
      })
      .catch((error) => {
        console.log("Error /api/categorias/quejas", error);
      })
      .finally(() => {});
  },

  watch: {
    "$store.state.example.filtro": function () {
      this.$q.loading.show("Filtrando");
      this.filtro = this.$store.state.example.filtro;
      this.filtrar("INPUT");
    },
    "$store.state.example.selectedFilter": function () {
      if (
        this.$store.state.example.selectedFilter &&
        this.$store.state.example.selectedFilter.length == 1
      ) {
        // Solo la primera letra (F, S, Q)
        this.$q.loading.show("Filtrando");
        this.filtrar("SELECT", this.$store.state.example.selectedFilter); // origen qSelect, letra de la opción seleccionada
      }
    },
    "$store.state.example.dlgFechas": function () {
      this.dialogoFechas = this.$store.state.example.dlgFechas;
    },
    "$store.state.example.generaExcel": function () {
      if (this.$store.state.example.generaExcel) {
        this.excel();
      }
    },
    "$store.state.example.sucursal": function () {
      if (this.$store.state.example.sucursal) {
        this.filtrar("SUCURSAL", this.$store.state.example.sucursal);
      }
    },
  }, // watch
}); // Export default
</script>
<style lang="sass">
.contenedor
  display: flex
  height: calc(100vh - 82px)
  border: 1px solid #e3e3e3

  .filtro
    flex: 0 15%
    background-color: grey
    color: white

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
    background: #0065c5 // #084B8A //#37474F

  .activo
    color: white
    background: #0a0a0a //#111111 // #1b1b1b //#242424 // #5f5f5f //#31CCEC //#26A69A //#1976D2

  .titulo
    font-weight: bold
    font-style: italic
    padding-right: 5px

  .fade-enter-active, .fade-leave-active
    transition: all .5s ease opacity .5s

  .fade-enter, .fade-leave-to // .fade-leave-active below version 2.1.8
    opacity: 0
</style>

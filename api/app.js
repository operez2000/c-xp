import express from 'express'
import Sequelize  from 'sequelize'
import axios from 'axios'
import fs from 'fs'
import sha1 from 'sha1'
import nodeMailer from 'nodemailer'
import cors from 'cors'
import formidable from 'formidable'
import path from 'path'
import throttle from 'express-throttle-bandwidth'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
console.log('__filename', __filename) // C:\dev\quasar\c-xp2\api\app.js

const __dirname = dirname(__filename)
console.log("__dirname", __dirname)   // C:\dev\quasar\c-xp2\api

const app = express()
// Body parser -> Express
app.use(express.json({ limit: '50mb', extended: true }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors())

const port = 3012
//fs.writeFileSync("process.env.json", JSON.stringify(process.env))

/*
const folder = path.join(__dirname, 'files')
if (!fs.existsSync(folder)) {
  fs.mkdirSync(folder, '0777')
}
*/

app.set('port', port)
app.use(throttle(1024 * 128)) // throttling bandwidth
const config = JSON.parse(fs.readFileSync("../config.json"))

const sql = new Sequelize({
  host: '10.200.0.72',
  port: '1443',
  username: 'sa',
  password: 'Vco$980224',
  database: 'SurveyMonkey',
  dialect: 'mssql',
  logging: false,
  dialectOptions: {
    options: {
      trustServerCertificate: true,
      requestTimeout: 50000,
      enableArithAbort: true,
      validateBulkLoadParameters: true,
      encrypt: false,
    }
  }
})

// RH
const sqlRH = new Sequelize({
  dialect: 'mysql',
  host: '10.200.0.56',
  username: 'remoto',
  password: 'Sis664!',
  database: 'rh',
  logging: false,
  timezone: '-07:00', //for writing to database
  dialectOptions:{
    //multipleStatements: true,
    //useUTC: false, //for reading from database
    dateStrings: true,
    typeCast: true
    /*
    options: {
      requestTimeout: 50000
      trustServerCertificate: true,
      encrypt: false
    }
    */
  },
})

// SurveyMonkey: parámetros
const surveyMonkey = {
  urlBase: 'https://api.surveymonkey.com/v3',
  headers: {
    'Content-Type': 'application/json',  // 'application/json;charset=utf-8'
    'Authorization': 'bearer wNa1xhhiPTyoybU03WNMrqFWoa7YRLOkumPrRtG2s8dlPLgJqwaH7Fodqbf.5iIkGD5P2OR54ateg0HA3CCM5l5oCflYpFt2y.JOgeacZzLWbXaXU1ye8npS1cJ2Yt7p'
  },
  idSurvey: '304624495',
  idCollector: '405771396',  // Prueba TI
  tokenWebHook: '4cb939ca53ec4ecdce3b8029e05e16d09662e028'  // SHA('SurveyMonkeyApi')
}

const mailConfig = {
  host: 'mail.certuslab.com',
  port: 465, //587,
  auth: {
      user: 'icertus@certuslab.com',
      pass: 'iCertus1!'
  },
  tls: {
    rejectUnauthorized: false
  }
}

const syncDelay = (milliseconds) => {
  var start = new Date().getTime()
  var end=0
  while( (end-start) < milliseconds){
      end = new Date().getTime()
  }
}

const addSlashes = (str) => {
  if (typeof str != 'string') {
    return str
  }
  return str.replace(/'/g, "\\'")
}

let myInterval // Tiene efecto en la funcion timer(action)
timer("ON") // por default "ON"

const mdi = (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, x-access-token, Authorization')
  res.setHeader('Access-Control-Allow-Credentials', true)

  console.log('-------------------------------------------------------');
  console.log(new Date().toLocaleString('es-MX', {timeZone: "America/Tijuana"}));
  console.log('req.query', req.query);
  console.log('req.body', req.body);
  console.log('req.params', req.params);
  next();
}

const ctrlError = (err, metodo = "", ruta = "") => {
  let cadena = `Error en ${metodo} | ${ruta} \r\n`
  if (err.code) {
    cadena += err.code + "\r\n"
  }
  if (err.message) {
    cadena += err.message
  }
  return cadena
}


// Búsqueda de respuestas en la API de SurveyMonkey y afectación a la Base de Datos 10.200.0.72(antes 192.168.10.18).SurveyMonkey.dbo.surveys
const responses = async (req, res) => {

  timer("OFF")

  let url = `${surveyMonkey.urlBase}/surveys/` // para leer el ID de la última encuesta
  let response
  let json = {}
  let totalPages = 0
  let contador = 0
  let arrResponses = []
  let qry = ''
  let encontrado
  let fechaHora = new Date().toLocaleString('en-CA', { timeZone: "America/Tijuana" })
  let nuevasRespuestas = 0
  let fechaEncuesta

  json.url = url

  try {
console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")
    // Obtención del SurveyID ---------------------------------------------------------------------------
    response = await axios({
      method: 'GET',
      url: url,
      headers: surveyMonkey.headers,
      params: {}
    })
    response = await response.data
//console.log(new Date().toLocaleString('fr-FR'), "responses() url", url, "response.data", response.data)
    json.result = 200
    json.data = response.data
    json.msg = "Ok"
    json.surveyId = json.data[0].id
    // Revisión de las respuestas de la encuesta para calcular las páginas totales ----------------------
    url =  `${surveyMonkey.urlBase}/surveys/${json.surveyId}/responses/?per_page=100`
    response = await axios({
      method: 'GET',
      url: url,
      headers: surveyMonkey.headers,
      params: {}
    })
    response = await response.data
//console.log(new Date().toLocaleString('fr-FR'), "responses() url", url, "response.data", response.data)
    totalPages  = ( (response.total % 100) > 0 ) ? (parseInt(response.total / 100) + 1) : (response.total / 100)
    totalPages = totalPages.toFixed(0)
    nuevasRespuestas = 0

    // Lectura de respuestas de las 5 últimas páginas  --------------------------------------------------
    for (let index = totalPages; index >= 0; index--) {

      if (++contador > 3) {  // Solo las últimas 3 páginas
        break
      }

      url = `${surveyMonkey.urlBase}/surveys/${json.surveyId}/responses/bulk/?page=${index}&per_page=100`

      response = await axios({
        method: 'GET',
        url: url,
        headers: surveyMonkey.headers,
        params: {}
      })

      arrResponses = await response.data.data
//console.log(new Date().toLocaleString('fr-FR'), "responses() en ciclo for url", url, "response.data", response.data)

      // Recorro las 100 respuestas para afectar en la BD
      for (let idx = 0; idx < arrResponses.length; idx++) {
        const element = arrResponses[idx]
        // Respuesta
        element.respuesta = ""
        encontrado = element.pages[0].questions.find(i => i.id == "639348685" )
        if (encontrado) {
          if (encontrado.answers) { // Detalle de las respuestas
            if (encontrado.answers[0].text) {
              element.respuesta = encontrado.answers[0].text
            }
          }
        }
        // Fecha de la encuesta
        let tempDateTime = new Date(element.date_created)
        let mes = '' + (tempDateTime.getMonth() + 1)
        let dia = '' + (tempDateTime.getDate())
        let fechaLocal = '' + tempDateTime.getFullYear() + '-' + mes.padStart(2, '0') + '-' + dia.padStart(2, '0')
        let horaLocal =  tempDateTime.toLocaleTimeString('fr-FR') // 13:06:03
        fechaEncuesta = fechaLocal + " " + horaLocal // fechaLocal.substr(6, 4) + "-" + fechaLocal.substr(3, 2) + "-" + fechaLocal.substr(0, 2) + " " + horaLocal

        let surveyDate = {
          fecha: tempDateTime.toLocaleString('ja-JP', {timeZone: 'America/Tijuana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'}).replace(/\//g,'-'),
          hora: tempDateTime.toLocaleTimeString({timeZone: 'America/Tijuana'})
        }

/*
element.date_created 2022-03-15T02:54:27+00:00 string
*/
        // Clasificacion
        element.clasificacion = "I"
        encontrado = element.pages[0].questions.find(i => (i.id == "652656765" || i.id == "683528498") )
        if (encontrado) {
          if (encontrado.answers) { // Detalle de las respuestas
            if (encontrado.answers[0].choice_id) {
              if (encontrado.answers[0].choice_id == "4494706492" || encontrado.answers[0].choice_id == "4288029398") {
                element.clasificacion = "F"
              } else if (encontrado.answers[0].choice_id == "4494706493" || encontrado.answers[0].choice_id == "4288029399" ) {
                element.clasificacion = "S"
              } else if (encontrado.answers[0].choice_id == "4494706494" || encontrado.answers[0].choice_id == "4288029400" ) {
                element.clasificacion = "Q"
              }
            }
          }
        }
        // Validación del formato de fecha de la orden
        if (element.metadata.contact.custom_value2.value.indexOf('/') >= 0) {
          // dd/mm/aaaa
          element.metadata.contact.custom_value2.value = element.metadata.contact.custom_value2.value.substr(6, 4) + "-" +
                                                         element.metadata.contact.custom_value2.value.substr(3, 2) + "-" +
                                                         element.metadata.contact.custom_value2.value.substr(0, 2) + " " +
                                                         element.metadata.contact.custom_value2.value.substr(11)
        }
        // Validación del formato de fecha de entrega
        if (element.metadata.contact.custom_value6.value.indexOf('/') >= 0) {
          // dd/mm/aaaa
          element.metadata.contact.custom_value6.value = element.metadata.contact.custom_value6.value.substr(6, 4) + "-" +
                                                         element.metadata.contact.custom_value6.value.substr(3, 2) + "-" +
                                                         element.metadata.contact.custom_value6.value.substr(0, 2) + " " +
                                                         element.metadata.contact.custom_value6.value.substr(11)
        }

        qry = `
          IF NOT EXISTS (SELECT responseId FROM surveys WHERE responseId = '${element.id}')
            BEGIN
              INSERT INTO surveys
                (oid, folioInterno, surveyId, responseId, collectorId, orden, fechaOrden, recepcionista, flebotomista, nombreSucursal, fechaEntrega, nombrePaciente, apellidosPaciente, emailPaciente, clasificacion, respuesta, fechaEnvioFelicitacion, fechaEnvioSugerencia, fechaEnvioQueja, encargado, seguimiento, fechaSeguimiento, solucion, fechaSolucion, evidenciaSolucion, fecha)
              VALUES
                (REPLACE(NEWID(), '-', ''),
                ( SELECT TOP 1 CONCAT( clasificacion, '-', FORMAT( (SELECT COUNT(oid) +1 FROM surveys WHERE clasificacion = '${element.clasificacion}'), '0000000#') )
                  FROM surveys
                  WHERE clasificacion = '${element.clasificacion}'),
                '${json.surveyId}', '${element.id}', '${element.collector_id}', '${element.metadata.contact.custom_value.value}', '${addSlashes(element.metadata.contact.custom_value2.value)}', '${addSlashes(element.metadata.contact.custom_value3.value)}', '${addSlashes(element.metadata.contact.custom_value4.value)}', '${element.metadata.contact.custom_value5.value}', '${addSlashes(element.metadata.contact.custom_value6.value)}', '${addSlashes(element.metadata.contact.first_name.value)}', '${addSlashes(element.metadata.contact.last_name.value)}', '${addSlashes(element.metadata.contact.email.value)}', '${element.clasificacion}', '${addSlashes(element.respuesta)}', NULL, NULL, NULL, '', 'N', NULL, 'N', NULL, NULL, '${surveyDate.fecha}');
            END
        `
console.log("-----------------------------------   inicio query   ---------------------------------------")
console.log(qry)
console.log("-----------------------------------     fin query    ---------------------------------------")
        response = await sql.query(qry)
        if (response[1]) {
          ++nuevasRespuestas
        }
        syncDelay(1000)

        if (element.clasificacion == 'Q') {
/*
          // En caso de ser Queja, agrego un registro por cada elemento del comité en SurveysDetail
          qry = `
            IF ( SELECT COUNT(sd.oid) contador FROM surveys s INNER JOIN surveysDetail sd ON s.oid = sd.surveyOid WHERE (s.clasificacion = 'Q') AND (s.responseId = '${element.id}') ) = 0
              BEGIN
                INSERT INTO surveysDetail
                  (oid, surveyOid, representante, visto, fechaVisto, fecha)
                (
                  SELECT REPLACE(NEWID(), '-', ''), (SELECT oid FROM surveys WHERE responseId = '${element.id}'), comite.representante, 'N', NULL, GETDATE()
                  FROM comite
                  WHERE (clasificacion = 'Q')
                )
              END
          `
          response = await sql.query(qry)
          syncDelay(1000)
*/
        }

      } // for arreglo de respuestas response.data.data

    } // for (5 ultimas paginas)
    fs.writeFileSync("logs.log", `${fechaHora}\r\n responses() \r\n Ok \r\n ${qry}\r\n ******************************** \r\n`, {flag: 'a'})

  } catch (err) {
    console.log(new Date().toLocaleString('fr-FR', { timeZone: "America/Tijuana" }), "\r\n", "responses().error ", "\r\n", url, "err", err, "\r\n", "qry", qry)
    let txtError = 'Indefinido'
    if (typeof err == 'object') {
      txtError = JSON.stringify(err)
    } else if (typeof err != 'string') {
      txtError = String(err)
    } else {
      txtError = err
    }
    json.result = 403
    json.msg = txtError
    json.data = txtError
    fs.writeFileSync("error.log", `${fechaHora}\r\n responses() \r\n ${txtError}\r\n ${qry}\r\n ******************************** \r\n`, {flag: 'a'})

  } finally {
console.log(new Date().toLocaleString('en-CA', { timeZone: "America/Tijuana" }), "1er Finally")
    console.log("Fin de proceso:", fechaHora, '/', json.result, json.msg, '/', "Páginas", totalPages, '/', 'Nuevas respuestas', nuevasRespuestas)
    syncDelay(1200)
    timer("ON")
console.log(new Date().toLocaleString('en-CA', { timeZone: "America/Tijuana" }), "2o Finally")
console.log("finally en responses() qry", qry)
console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^   FIN   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^")

  }

} // responses()


// Lectura de encuestas y afectación en la Base de Datos
const procesarEncuestas = () => {
  // Espero 3 segundos para procesar
  console.log("Iniciando proceso de lectura desde la API:", new Date().toLocaleString('en-CA', { timeZone: "America/Tijuana" }))
  let promesa = responses()
  syncDelay(2000)
} // procesarEncuestas()


//const sendEmail = (correos, cc = '', txtClasificacion, subject, body, qry) => {
const sendEmail = async (jsonOpciones) => {
  let transporter
  let mailOptions
  let info
  let fecha = new Date().toLocaleString('en-CA', { timeZone: "America/Tijuana" }).replace(/,/g, '')
  let json = {}
  let results
  let enviado = false
  let qry
  let responsables

  timer("OFF")

  /*
  jsonOpciones = {
    email: element.suc_email,
    cc: cc,
    clasificacion: "F",
    subject: `Notificación de Felicitaciones // Encuestas de Pacientes // ${element.nombre} // ${fechaHora}`,
    body: body,
    qry: qry
  }
  */

  if (typeof jsonOpciones.email == "object" || typeof jsonOpciones.email == "array") {
    jsonOpciones.email = jsonOpciones.email.toString()
  }

  /*
  jsonOpciones.email = 'oscar.perez@certuslab.com.mx'
  jsonOpciones.cc = ''
  */

  console.log("Iniciando envío", fecha, "email" , jsonOpciones.email, "subject", jsonOpciones.subject)

  syncDelay(1200)

  try {
    if ((jsonOpciones.body != '') && (jsonOpciones.email != '')) {      // debe tener contenido y cuenta de correo para envío

      mailOptions = {
        from: 'Certus Lab icertus@certuslab.com', // sender address
        to: jsonOpciones.email, // list of receivers
        cc: jsonOpciones.cc,
        bcc: 'oscar.perez@certuslab.com.mx',
        subject: jsonOpciones.subject,   // `${txtClasificacion} // Encuesta ${surveyDetail.responseId} // ${fechaHora}`, // Subject line
        html: jsonOpciones.body // plain text body
      }
      //process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
      transporter = nodeMailer.createTransport(mailConfig)
      info = await transporter.sendMail(mailOptions)    //, (error, info) => {

      enviado = (info.accepted.length > 0)

      // Todo bien, afecto a la BD
      console.log("Aceptado:", info.accepted, info.accepted.length);
      if (jsonOpciones.qry != '') {
        results = await sql.query(jsonOpciones.qry)
        json.results = results[0]
        json.metadata = results[1]
        console.log("Resultados de la afectación en BD - metadata", json.metadata, "results", json.results)
        syncDelay(3000)
        console.log("3 segundos después de la afectación a la BD")
      }

      // Agrego los envíos rechazados al log
      if (info.rejected.length > 0) {
        console.log("Rechazados", info.rejected)
        fs.writeFileSync("rechazados.log", `${fecha}\r\n ${info.rejected.toString()}\r\n`, {flag: 'a'})
      }
    }
  } catch (err) {
    let txtError = (typeof err == 'object') ? JSON.stringify(err) : err
    console.log("Error al enviar correo sendEmail() (catch)", err)
    fs.writeFileSync("error-afectacion-bd.log", `${fecha}\r\n ${txtError}\r\n`, {flag: 'a'})

  } finally {
    console.log("finally en sendEmail()", fecha)
    console.log('---------------------------------------------------------------')
    syncDelay(1200)
    timer("ON")

  }

  return enviado

} // sendEmail()


// Envío de correos
const procesarEnvios = async (clasificacion) => {

  timer("OFF")
  console.log("Iniciando proceso para enviar correos:", new Date().toLocaleString('en-CA', { timeZone: "America/Tijuana" }), "/", clasificacion)

  let body = '',
      correos = '',
      txtClasificacion,
      qry,
      results,
      arrSucursales,
      idSucursal,
      arrSurveys,
      responseIds,
      fechaHora = new Date().toLocaleString('fr-FR', { timeZone: "America/Tijuana" }).replace(/\//g, '-'),  //14-03-2022, 13:13:34
      cc,
      comite,
      fechaEnvio = new Date().toLocaleString(
        'es-MX',
        {
          timeZone: 'America/Tijuana', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true
        }
      ).replace(/\//g, "-")

  try {

    if (clasificacion == 'F') {
      txtClasificacion = "Felicitación"  //-----------------------------------------------------------------------------------------------------------------

      // Busco al comité de Felicitaciones
      qry = `SELECT representante FROM comite WHERE clasificacion = '${clasificacion}' `
      results = await sql.query(qry)
      results = await results[0]

      // Busco en RH los correos y nombres del comité
      results = results.map(v => "\'" + v.representante + "\'")
      qry = `SELECT correo_empresa FROM correos WHERE empleado_codigo IN (${results})`
      results = await sqlRH.query(qry)
      results = await results[0]
      cc = results.map(v => v.correo_empresa)

      // Busco las sucursales involucradas y su email
      qry = `
        SELECT DISTINCT LEFT(s.orden, 3) idSucursal, suc.codigo, suc.nombre, CASE WHEN suc.email IS NULL THEN '' ELSE LOWER(suc.email) END suc_email
        FROM surveys s
          LEFT JOIN Sicryp.dbo.SassSucursales  suc ON LEFT(orden, 3) = suc.codigo
        WHERE (clasificacion = '${clasificacion}') AND ((fechaEnvioFelicitacion IS NULL) OR (YEAR(fechaEnvioFelicitacion) = 1900)) AND (DATALENGTH(s.respuesta) > 0)
        ORDER BY idSucursal
      `
      results = await sql.query(qry)
      results = await results[0]
      arrSucursales = results

      // Leo las felicitaciones que no se han enviado (acumular en un día)
      qry = `
        SELECT
          s.oid, LEFT(s.orden, 3) idSucursal, s.responseId, s.orden,
          CONCAT( CONVERT(varchar, s.fechaOrden, 105), ', ', CONVERT(varchar(5), s.fechaOrden, 108) ) fechaOrden, s.nombreSucursal, s.recepcionista, s.flebotomista,
          CONCAT(LTRIM(RTRIM(s.nombrePaciente)), ' ', LTRIM(RTRIM(s.apellidosPaciente))) nombreCompletoPaciente, s.emailPaciente, s.respuesta
        FROM surveys s
        WHERE (s.clasificacion = '${clasificacion}') AND
          ((s.fechaEnvioFelicitacion IS NULL) OR (YEAR(s.fechaEnvioFelicitacion) = 1900)) AND
          (DATALENGTH(s.respuesta) > 0)
        ORDER BY s.orden, s.responseId
      `
      results = await sql.query(qry)
      results = await results[0]

      // Recorro las sucursales para filtrar los mensajes que le corresponden y posteriormente enviar por email
      arrSucursales.forEach(element => {
        arrSurveys = results.filter(v => v.idSucursal == element.idSucursal)  // Filtro todas las encuestas por la sucursal en cuestión
        body = ''
        // Concateno todas las encuestas de la sucursal
        responseIds = ''
        arrSurveys.forEach(surveyDetail => {
          body += `
            <div style="font-size: 1.1em; font-family: Verdana">
              <h3>Folio de Encuesta: <strong>${surveyDetail.responseId}</strong></h3>
              <hr style="border: 3px solid #00468b;background-color:#00468b;border-radius: 2px;">
              <ul>
                  <li><strong>Orden: </strong>${surveyDetail.orden}</li>
                  <li><strong>Fecha de Orden: </strong>${surveyDetail.fechaOrden}</li>
                  <li><strong>Sucursal: </strong>${surveyDetail.nombreSucursal}</li>
                  <li><strong>Recepcionista: </strong>${surveyDetail.recepcionista}</li>
                  <li><strong>Flebotomista: </strong>${surveyDetail.flebotomista}</li>
                  <li><strong>Paciente: </strong>${surveyDetail.nombreCompletoPaciente}</li>
                  <li><strong>Correo: </strong>${surveyDetail.emailPaciente}</li>
                  <li><strong>Respuesta: </strong>${surveyDetail.respuesta}</li>
              </ul>
            </div>
            <br>
          `
          if (responseIds != '') {
            responseIds += ','
          }
          responseIds += surveyDetail.responseId
        }) // arrSurveys.forEach()

/* Detenido el envío de felicitaciones hasta nuevo aviso *******************************************************************************************
        sendEmail({
          email: element.suc_email,
          cc: cc,
          clasificacion: txtClasificacion,
          subject: `Notificación de Felicitaciones // Encuestas de Pacientes // ${element.nombre} // ${fechaHora.substr(0, 17)}`,
          body: body,
          qry: `UPDATE surveys SET fechaEnvioFelicitacion = GETDATE() WHERE responseId IN (${responseIds})`
        })
*/

      }) // arrSucursales.forEach()

    } else if (clasificacion == 'S-old') {
      txtClasificacion = "Sugerencia"     //-----------------------------------------------------------------------------------------------------------------

      // Busco al comité de Sugerencias
      qry = `SELECT representante FROM comite WHERE clasificacion = '${clasificacion}' `
      results = await sql.query(qry)
      results = await results[0]

      // Busco en RH los correos y nombres del comité
      results = results.map(v => "\'" + v.representante + "\'")
      qry = `SELECT correo_empresa FROM correos WHERE empleado_codigo IN (${results})`
      results = await sqlRH.query(qry)
      results = await results[0]
      cc = results.map(v => v.correo_empresa)

      // Busco las sucursales involucradas y su email
      qry = `
        SELECT DISTINCT LEFT(s.orden, 3) idSucursal, suc.codigo, suc.nombre, CASE WHEN suc.email IS NULL THEN '' ELSE LOWER(suc.email) END suc_email
        FROM surveys s
          LEFT JOIN Sicryp.dbo.SassSucursales  suc ON LEFT(orden, 3) = suc.codigo
        WHERE (clasificacion = '${clasificacion}') AND ((fechaEnvioSugerencia IS NULL) OR (YEAR(fechaEnvioSugerencia) = 1900)) AND (DATALENGTH(s.respuesta) > 0)
        ORDER BY idSucursal
      `
      results = await sql.query(qry)
      results = await results[0]
      arrSucursales = results

      // Leo las sugerencias que no se han enviado (acumular en un día)
      qry = `
        SELECT
          s.oid, LEFT(s.orden, 3) idSucursal, s.responseId, s.orden,
          CONCAT( CONVERT(varchar, s.fechaOrden, 105), ', ', CONVERT(varchar(5), s.fechaOrden, 108) ) fechaOrden, s.nombreSucursal, s.recepcionista, s.flebotomista,
          CONCAT(LTRIM(RTRIM(s.nombrePaciente)), ' ', LTRIM(RTRIM(s.apellidosPaciente))) nombreCompletoPaciente, s.emailPaciente, s.respuesta
        FROM surveys s
        WHERE (s.clasificacion = '${clasificacion}') AND
          ((s.fechaEnvioSugerencia IS NULL) OR (YEAR(s.fechaEnvioSugerencia) = 1900)) AND (DATALENGTH(s.respuesta) > 0)
        ORDER BY s.orden, s.responseId
      `
      results = await sql.query(qry)
      results = await results[0]

      // Recorro las sucursales para filtrar los mensajes que le corresponden y posteriormente enviar por email
      arrSucursales.forEach(element => {
        arrSurveys = results.filter(v => v.idSucursal == element.idSucursal)  // Filtro todas las encuestas por la sucursal en cuestión
        body = ''
        // Concateno todas las encuestas de la sucursal
        responseIds = ''
        arrSurveys.forEach(surveyDetail => {
          body += `
            <div style="font-size: 1.1em; font-family: Verdana">
              <h3>Folio de Encuesta: <strong>${surveyDetail.responseId}</strong></h3>
              <hr style="border: 3px solid #00468b;background-color:#00468b;border-radius: 2px;">
              <ul>
                  <li><strong>Orden: </strong>${surveyDetail.orden}</li>
                  <li><strong>Fecha de Orden: </strong>${surveyDetail.fechaOrden}</li>
                  <li><strong>Sucursal: </strong>${surveyDetail.nombreSucursal}</li>
                  <li><strong>Recepcionista: </strong>${surveyDetail.recepcionista}</li>
                  <li><strong>Flebotomista: </strong>${surveyDetail.flebotomista}</li>
                  <li><strong>Paciente: </strong>${surveyDetail.nombreCompletoPaciente}</li>
                  <li><strong>Correo: </strong>${surveyDetail.emailPaciente}</li>
                  <li><strong>Sugerencia: </strong>${surveyDetail.respuesta}</li>
              </ul>
            </div>
            <br>
          `
          if (responseIds != '') {
            responseIds += ','
          }
          responseIds += surveyDetail.responseId
        }) // arrSurveys.forEach()

        sendEmail({
          email: element.suc_email,
          cc: cc,
          clasificacion: txtClasificacion,
          subject: `Resumen de Encuestas // [Tipo] Sugerencia // ${element.nombre} // ${fechaEnvio}`,
          body: body,
          qry: `UPDATE surveys SET fechaEnvioSugerencia = GETDATE() WHERE responseId IN (${responseIds})`
        })

      }) // arrSucursales.forEach()

    } else if (clasificacion == 'S') {
      txtClasificacion = "Sugerencia"     //-----------------------------------------------------------------------------------------------------------------

      // Busco al comité de Sugerencias
      qry = `SELECT representante FROM comite WHERE clasificacion = '${clasificacion}' `
      results = await sql.query(qry)
      results = await results[0]

      // Busco en RH los correos y nombres del comité
      results = results.map(v => "\'" + v.representante + "\'")
      qry = `SELECT correo_empresa FROM correos WHERE empleado_codigo IN (${results})`
      results = await sqlRH.query(qry)
      results = await results[0]
      cc = results.map(v => v.correo_empresa)

      // Busco las sucursales involucradas y su email
      qry = `
        SELECT DISTINCT LEFT(s.orden, 3) idSucursal, suc.codigo, suc.nombre, CASE WHEN suc.email IS NULL THEN '' ELSE LOWER(suc.email) END suc_email
        FROM surveys s
          LEFT JOIN Sicryp.dbo.SassSucursales  suc ON LEFT(orden, 3) = suc.codigo
        WHERE (clasificacion = '${clasificacion}') AND ((fechaEnvioSugerencia IS NULL) OR (YEAR(fechaEnvioSugerencia) = 1900)) AND (DATALENGTH(s.respuesta) > 0)
        ORDER BY idSucursal
      `
      results = await sql.query(qry)
      results = await results[0]
      arrSucursales = results

      // Leo las sugerencias que no se han enviado (acumular en un día)
      qry = `
        SELECT
          s.oid, LEFT(s.orden, 3) idSucursal, s.responseId, s.orden,
          CONCAT( CONVERT(varchar, s.fechaOrden, 105), ', ', CONVERT(varchar(5), s.fechaOrden, 108) ) fechaOrden, s.nombreSucursal, s.recepcionista, s.flebotomista,
          CONCAT(LTRIM(RTRIM(s.nombrePaciente)), ' ', LTRIM(RTRIM(s.apellidosPaciente))) nombreCompletoPaciente, s.emailPaciente, s.respuesta
        FROM surveys s
        WHERE (s.clasificacion = '${clasificacion}') AND
          ((s.fechaEnvioSugerencia IS NULL) OR (YEAR(s.fechaEnvioSugerencia) = 1900)) AND (DATALENGTH(s.respuesta) > 0)
        ORDER BY s.orden, s.responseId
      `
      results = await sql.query(qry)
      results = await results[0]

      // Recorro todas las Sugerencias pendientes de envio
      body = ''
      idSucursal = ''
      responseIds = ''
      results.forEach(element => {

        // Cada cambio de sucursal en el arreglo
        if (idSucursal != element.idSucursal) {
          idSucursal = element.idSucursal
          body += `
            <div style="text-align: center;font-family:Verdana">
              <h2>Sucursal ${element.nombreSucursal}</h2>
            </div>
          `
        }
        // Concateno el cuerpo del correo con la información de la encuesta
        body += `
          <div style="font-size: 1.1em; font-family: Verdana">
            <h3>Folio de Encuesta: <strong>${element.responseId}</strong></h3>
            <hr style="border: 3px solid #00468b;background-color:#00468b;border-radius: 2px;">
            <ul>
                <li><strong>Orden: </strong>${element.orden}</li>
                <li><strong>Fecha de Orden: </strong>${element.fechaOrden}</li>
                <li><strong>Sucursal: </strong>${element.nombreSucursal}</li>
                <li><strong>Recepcionista: </strong>${element.recepcionista}</li>
                <li><strong>Flebotomista: </strong>${element.flebotomista}</li>
                <li><strong>Paciente: </strong>${element.nombreCompletoPaciente}</li>
                <li><strong>Correo: </strong>${element.emailPaciente}</li>
                <li><strong>Sugerencia: </strong>${element.respuesta}</li>
            </ul>
          </div>
          <br>
        `
        // Concateno los ID's para enviarlos al query que va a afectar la fecha de envío
        if (responseIds != '') {
          responseIds += ','
        }
        responseIds += element.responseId
      })  // forEach.results()

      sendEmail({
        email: cc,
        cc: '',
        clasificacion: txtClasificacion,
        subject: `Resumen de Encuestas // Tipo Sugerencia // ${fechaEnvio}`,
        body: body,
        qry: `UPDATE surveys SET fechaEnvioSugerencia = GETDATE() WHERE responseId IN (${responseIds})`
      })


    } else if (clasificacion == 'Q') {
      txtClasificacion = "Queja"     //-----------------------------------------------------------------------------------------------------------------

      // Busco al comité de Quejas
      qry = `SELECT representante FROM comite WHERE clasificacion = '${clasificacion}' `
      results = await sql.query(qry)
      results = await results[0]

      // Busco en RH los correos y nombres del comité
      results = results.map(v => "\'" + v.representante + "\'")
      qry = `SELECT correo_empresa FROM correos WHERE empleado_codigo IN (${results})`
      results = await sqlRH.query(qry)
      results = await results[0]
      cc = results.map(v => v.correo_empresa)

      // Busco las sucursales involucradas y su email
      qry = `
        SELECT DISTINCT LEFT(s.orden, 3) idSucursal, suc.codigo, suc.nombre, CASE WHEN suc.email IS NULL THEN '' ELSE LOWER(suc.email) END suc_email
        FROM surveys s
          LEFT JOIN Sicryp.dbo.SassSucursales  suc ON LEFT(orden, 3) = suc.codigo
        WHERE (clasificacion = '${clasificacion}') AND ((fechaEnvioQueja IS NULL) OR (YEAR(fechaEnvioQueja) = 1900)) AND (DATALENGTH(s.respuesta) > 0)
        ORDER BY idSucursal
      `
      results = await sql.query(qry)
      results = await results[0]
      arrSucursales = results

      // Leo las Quejas que no se han enviado (acumular en un día)
      qry = `
        SELECT
          s.oid, LEFT(s.orden, 3) idSucursal, s.responseId, s.orden,
          CONCAT( CONVERT(varchar, s.fechaOrden, 105), ', ', CONVERT(varchar(5), s.fechaOrden, 108) ) fechaOrden, s.nombreSucursal, s.recepcionista, s.flebotomista,
          CONCAT(LTRIM(RTRIM(s.nombrePaciente)), ' ', LTRIM(RTRIM(s.apellidosPaciente))) nombreCompletoPaciente, s.emailPaciente, s.respuesta
        FROM surveys s
        WHERE (s.clasificacion = '${clasificacion}') AND
          ((s.fechaEnvioQueja IS NULL) OR (YEAR(s.fechaEnvioQueja) = 1900)) AND (DATALENGTH(s.respuesta) > 0)
        ORDER BY s.orden, s.responseId DESC
      `
      results = await sql.query(qry)
      results = await results[0]

      // Administradores de las quejas (se enviará un correo adicional a los administradores para asignar al responsable)
      qry = `
        SELECT CONCAT(nombre, ' ', email) responsable
        FROM responsables
        WHERE rol = 'A'
      `
      let administradores = await sql.query(qry)
      administradores = administradores[0].map(v => v.responsable).toString()
//administradores = 'Oscar Pérez oscar.perez@certuslab.com.mx'

      // Recorro todas las quejas
      body = ''
      idSucursal = ''
      responseIds = ''
      results.forEach(element => {

        // Cada cambio de sucursal en el arreglo
        if (idSucursal != element.idSucursal) {
          idSucursal = element.idSucursal
          body += `
            <div style="text-align: center;font-family:Verdana">
              <h2>Sucursal ${element.nombreSucursal}</h2>
            </div>
          `
        }
        // Concateno el cuerpo del correo con la información de la encuesta
        body += `
          <div style="font-size: 1.1em; font-family: Verdana">
            <h3>Folio de Encuesta: <strong>${element.responseId}</strong></h3>
            <hr style="border: 3px solid #00468b;background-color:#00468b;border-radius: 2px;">
            <ul>
                <li><strong>Orden: </strong>${element.orden}</li>
                <li><strong>Fecha de Orden: </strong>${element.fechaOrden}</li>
                <li><strong>Sucursal: </strong>${element.nombreSucursal}</li>
                <li><strong>Recepcionista: </strong>${element.recepcionista}</li>
                <li><strong>Flebotomista: </strong>${element.flebotomista}</li>
                <li><strong>Paciente: </strong>${element.nombreCompletoPaciente}</li>
                <li><strong>Correo: </strong>${element.emailPaciente}</li>
                <li><strong>Queja: </strong>${element.respuesta}</li>
            </ul>
          </div>
          <br>
        `
        // Concateno los ID's para enviarlos al query que va a afectar la fecha de envío
        if (responseIds != '') {
          responseIds += ','
        }
        responseIds += element.responseId

        // Envío a los administradores para asignar responsabole
        sendEmail({
          email: administradores,
          cc: '',
          clasificacion: txtClasificacion,
          subject: `Notificación de Queja para Asignación // Id ${element.responseId} // ${fechaEnvio}`,
          body: `
            <div style="font-family: Verdana;font-size: 1.2em;">
              <h4>Favor de asignar la Queja ${element.responseId} a un responsable para su seguimiento.</h4>
              <br>
              <a href="${config.frontendUrl}/encuestas/?responseId=${element.responseId}">Abrir ésta liga para ir directamente a la Queja</a>
              <br>
              <p>Certus Laboratorio</p>
            </div>`,
          qry: ''
        })

      }) // forEach

      // Envío general
      sendEmail({
        email: cc,
        cc: '',
        clasificacion: txtClasificacion,
        subject: `Resumen de Encuestas // Tipo Queja // ${fechaEnvio}`,
        body: body,
        qry: `UPDATE surveys SET fechaEnvioQueja = GETDATE() WHERE responseId IN (${responseIds})`
      })

    } else if (clasificacion == "Q-old-inicial") {
      txtClasificacion = "Queja"          //-----------------------------------------------------------------------------------------------------------------

      // Busco al comité de Quejas
      qry = `SELECT representante FROM comite WHERE clasificacion = '${clasificacion}' `
      results = await sql.query(qry)
      results = await results[0]  // TJM075, TJM062

      // Busco en RH los correos y nombres del comité
      results = results.map(v => "\'" + v.representante + "\'")
      qry = `
        SELECT
          e.empleado_codigo, CONCAT(TRIM(e.empleado_nombre), ' ', TRIM(e.empleado_appaterno)) nombre,
          CASE WHEN c.correo_empresa IS NULL THEN '' ELSE LOWER(c.correo_empresa) END correo_empresa
        FROM empleados e
          INNER JOIN correos c ON e.empleado_codigo = c.empleado_codigo
        WHERE e.empleado_codigo IN (${results})
      `
      results = await sqlRH.query(qry)
      results = await results[0]
      comite = results
      cc = comite.map(v => v.correo_empresa)  // convierto un arreglo de correos

      // Leo las quejas que no se han enviado
      qry = `
        SELECT
          s.oid, LEFT(s.orden, 3) idSucursal, s.responseId, s.orden,
          CONCAT( CONVERT(varchar, s.fechaOrden, 105), ' ', CONVERT(varchar(5), s.fechaOrden, 108) ) fechaOrden, s.nombreSucursal, s.recepcionista, s.flebotomista,
          CONCAT(LTRIM(RTRIM(s.nombrePaciente)), ' ', LTRIM(RTRIM(s.apellidosPaciente))) nombreCompletoPaciente, s.emailPaciente, s.respuesta,
          (SELECT LOWER(email) FROM Sicryp.dbo.SassSucursales WHERE codigo = LEFT(s.orden, 3)) emailSucursal
        FROM surveys s
        WHERE (s.clasificacion = '${clasificacion}') AND
          ((s.fechaEnvioQueja IS NULL) OR (YEAR(s.fechaEnvioQueja) = 1900)) AND
          (DATALENGTH(s.respuesta) > 0)
        ORDER BY s.fechaOrden, s.responseId
      `
      results = await sql.query(qry)
      results = await results[0]
      // Recorro las quejas para enviarlas por email (sucursales y comité)
      results.forEach(element => {
        body = `
          <div style="font-size: 1.1em; font-family: Verdana">
            <h3>Folio de Encuesta: <strong>${element.responseId}</strong></h3>
            <hr style="border: 3px solid #00468b;background-color:#00468b;border-radius: 2px;">
            <ul>
                <li><strong>Orden: </strong>${element.orden}</li>
                <li><strong>Fecha de Orden: </strong>${element.fechaOrden}</li>
                <li><strong>Sucursal: </strong>${element.nombreSucursal}</li>
                <li><strong>Recepcionista: </strong>${element.recepcionista}</li>
                <li><strong>Flebotomista: </strong>${element.flebotomista}</li>
                <li><strong>Paciente: </strong>${element.nombreCompletoPaciente}</li>
                <li><strong>Correo: </strong>${element.emailPaciente}</li>
                <li><strong>Respuesta: </strong>${element.respuesta}</li>
            </ul>
          </div>
          <br>
        `

        if (element.emailSucursal != '') {
          // Enviar correo a la sucursal
          sendEmail({
            email: element.emailSucursal,
            cc: '',   // cc
            clasificacion: txtClasificacion,
            subject: `Resumen de Encuestas // Tipo Queja // ${fechaEnvio}`,
            body: body,
            qry: `UPDATE surveys SET fechaEnvioQueja = GETDATE() WHERE responseId = '${element.responseId}'`
          })
        }

        // Envío la queja a cada elemento del comité
        comite.forEach(item => {
          if (item.correo_empresa != '') {
            sendEmail({
              email: item.correo_empresa,
              cc: '',
              clasificacion: txtClasificacion,
              subject: `Notificación de Queja // Encuestas de Pacientes // Folio ${element.responseId} // ${element.nombreSucursal} // ${fechaEnvio}`,
              body: body,
              qry: ''
            })
          }
        }) // comite.forEach

      }) // results.forEach()  // quejas pendientes de envío

    } // if (clasificacion)

  } catch (error) {
    console.log("Error al enviar correo procesarEnvios() (catch)", error)
    console.log('qry', qry)
    console.log('-----------------------------------------------')
    fs.writeFileSync("error.log", `${fechaHora}\r\n ${String(error)}\r\n ${qry}\r\n ******************************** \r\n`, {flag: 'a'})

  } finally {
    syncDelay(1200)
    timer("ON")
    console.log("finally en procesarEnvios()", new Date().toLocaleString('en-CA', { timeZone: "America/Tijuana" }))
    console.log('-----------------------------------------------')

  }

} // procesarEnvios()


app.use("/api/test", mdi, async (req, res) => {
  res.end("Ok")

  let qry
  let responsable = {
    id: '',
    nombre: '- Sin Asignar -' ,
    email: '',
    results: []
  }

  qry = `
    SELECT nombre, email FROM responsables WHERE id = '4D329B6655C9429F9ED871340D5BCA0'
  `
  responsable.results = await sql.query(qry)
console.log("results", responsable.results[0][0])
  if (responsable.results[0][0] == undefined) {
    console.log("No Encontrado")
  } else {
    console.log("Encontrado > 0")
  }

  //procesarEnvios(req.params.clasif)
  //timer(req.params.clasif)
/*
  let mailOptions = {
    from: 'Certus Lab icertus@certuslab.com', // sender address
    to: "oscar.perez@certuslab.com.mx", // list of receivers
    bcc: 'oscar.perez@certuslab.com.mx',
    subject: "Tema de prueba",   // `${txtClasificacion} // Encuesta ${surveyDetail.responseId} // ${fechaHora}`, // Subject line
    html: "<h3>Texto de prueba</h3><p>Fin de correo de prueba...</p>" // plain text body
  }
  //process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
  let transporter = nodeMailer.createTransport(mailConfig)
  let info = await transporter.sendMail(mailOptions)    //, (error, info) => {

  // Todo bien, afecto a la BD
  console.log("Aceptado:", info.accepted, info.accepted.length)
*/
})

app.use("/api/prueba", mdi, (req, res) => {
  console.log("Prueba")

  const folder = path.join(__dirname, 'files')
  let fileToDownload = path.join(folder, 'WEB26447.pdf')
  // console.log('download')
  //res.download(fileToDownload)

  //console.log('sendFile')
  //res.sendFile(fileToDownload)

  /* Abrir en el navegador */
  fs.readFile(fileToDownload , function (err, data) {
    res.contentType("application/pdf")
    //res.send(data)
    fs.createReadStream(fileToDownload).pipe(res)
  })

  if (!res.headersSent) {
//    res.end("Ok prueba")
  }

/*
  let fullUrl = req.protocol + '://' + req.get('host')
  console.log(fullUrl)

  let files = []
  let index = 0
  fs.readdirSync(folder).forEach(file => {
    files.push({
      id: index++,
      file: file,
      path: `${fullUrl}/files/${file}`
    })
  })
//  console.log('files', files)
  res.json(files)
  */

})

// Búsqueda de surveys
app.use("/api/surveys", mdi, (req, res) => {
  let json = {}

  // Temporal -----------------------------------------------------------------------------------------
  res.json({
    result: 200,
    msg: "Ok",
    data: {
      data: [
        {
            id: "304624495",
            title: "Tu Voz, Nuestra Guía",
            nickname: "",
            href: "https://api.surveymonkey.com/v3/surveys/304624495"
        },
        {
            id: "309490982",
            title: "PRUEBA PARA PREGUNTA 9",
            nickname: "",
            href: "https://api.surveymonkey.com/v3/surveys/309490982"
        },
        {
            id: "309327447",
            title: "Dr. (a) Su voz es nuestra guía para\nconocer sus necesidades y nos da la oportunidad de brindarle un mejor servicio.",
            nickname: "",
            href: "https://api.surveymonkey.com/v3/surveys/309327447"
        },
        {
            id: "307855692",
            title: "Tu Voz, Nuestra Guía",
            nickname: "",
            href: "https://api.surveymonkey.com/v3/surveys/307855692"
        }
      ],
      per_page: 50,
      page: 1,
      total: 4,
      links: {
          self: "https://api.surveymonkey.com/v3/surveys?page=1&per_page=50"
      }
    }
  })
  return
  // ----------------------------------------------------------------------------------------- Temporal



  // Informacion para leer la cantidad de recipientes en el recolector actual, desde la API de SurveyMonkey
  let url = `${surveyMonkey.urlBase}/surveys`
  axios({
    method: 'GET',
    url: url,
    headers: surveyMonkey.headers,
    params: {}
  }).then(response => {
    json.result = 200
    json.msg = "Ok"
    json.data = response.data
  }).catch(err => {
    json.result = 403
    json.msg = ""
    json.data = err
  }).finally(() => {
    res.json(json)
  })

}) // /api/surveys


// Búsqueda de recolectores
app.use("/api/collectors/:id", mdi, (req, res) => {
  let json = {}

  // Informacion para leer la cantidad de recipientes en el recolector actual, desde la API de SurveyMonkey
  let url = `${surveyMonkey.urlBase}/surveys/${req.params.id}/collectors`
  axios({
    method: 'GET',
    url: url,
    headers: surveyMonkey.headers,
    params: {}
  }).then(response => {
    json.result = 200
    json.msg = "Ok"
    json.data = response.data
  }).catch(err => {
    let txtErr = (typeof err == "object") ? JSON.stringify(err) : err
    if (err.response.data.error.name != undefined) {
      txtErr = err.response.data.error.id + " " + err.response.data.error.name
    }
    json.result = 403
    json.msg = txtErr
    json.data = (err.response.data.error) ? err.response.data.error : JSON.stringify(err)
    fs.writeFileSync("error.log", `${fechaHora}\r\n /api/collectors/:id \r\n ${txtErr}\r\n ${qry}\r\n ******************************** \r\n`, {flag: 'a'})
  }).finally(() => {
    res.json(json)
  })

}) // /api/collectors/:id


// Búsqueda de respuestas por recolector
app.use("/api/collector-responses/:id", mdi, (req, res) => {
  let json = {}

  // Informacion para leer la cantidad de recipientes en el recolector actual, desde la API de SurveyMonkey
  let url = `${surveyMonkey.urlBase}/collectors/${req.params.id}/responses/`
  if (req.query.page) {
    url += `bulk/?page=${req.query.page}`
  }
  axios({
    method: 'GET',
    url: url,
    headers: surveyMonkey.headers,
    params: {}
  }).then(response => {
    json.result = 200
    json.msg = "Ok"
    json.data = response.data
  }).catch(err => {
    let txtErr = (typeof err == "object") ? JSON.stringify(err) : err
    if (err.response.data.error.name != undefined) {
      txtErr = err.response.data.error.id + " " + err.response.data.error.name
    }
    json.result = 403
    json.msg = txtErr
    json.data = (err.response.data.error) ? err.response.data.error : JSON.stringify(err)
    fs.writeFileSync("error.log", `${fechaHora}\r\n /api/collector-responses/:id \r\n ${txtErr}\r\n ${qry}\r\n ******************************** \r\n`, {flag: 'a'})
    }).finally(() => {
    res.json(json)
  })

}) // /api/collector-responses/:id


// Búsqueda de respuestas por encuesta
app.use("/api/survey-responses/:id", mdi, (req, res) => {
  responses(req, res)
}) // /api/survey-responses/:id


// Búsqueda de encuestas
app.use("/api/encuestas", mdi, (req, res) => {
  let json = {}
  let qry = `
    SELECT TOP 100 *
    FROM envios
    ORDER BY fecha DESC
  `
  sql.query(qry).then(([results]) => {
    json.result = (results.length > 0) ? 200 : 500
    json.msg = (results.length > 0) ? "Ok" : "Sin registros"
    json.records = results.length
    json.data = results
  }).catch(err => {
    json.result = 403
    json.data = []
    json.records = 0
    json.msg = `Error ${err}`
  }).finally(() => {
    res.json(json)
  })

}) // /api/encuestas


app.use("/api/responses", async (req, res) => {
  let json = {} //fs.readFileSync('./src-ssr/middlewares/responses.json'); res.end(json)
  let results
  let qry

  try {
    qry = `
      SELECT
        oid, folioInterno, surveyId survey_id, responseId id, collectorId collector_id, orden custom_value, CONVERT(varchar(16), fechaOrden, 120) custom_value2, recepcionista custom_value3,
        flebotomista custom_value4, nombreSucursal custom_value5, CONVERT(varchar(16), fechaEntrega, 120) custom_value6, nombrePaciente first_name, apellidosPaciente last_name,
        CONCAT(LTRIM(RTRIM(nombrePaciente)), ' ', LTRIM(RTRIM(apellidosPaciente))) nombreCompletoPaciente, emailPaciente email, clasificacion,
        CASE clasificacion WHEN 'F' THEN 'positive' WHEN 'S' THEN 'warning' WHEN 'Q' THEN 'negative' ELSE 'dark' END color, respuesta,
        CASE WHEN fechaEnvioFelicitacion IS NULL OR YEAR(fechaEnvioFelicitacion) = 1900 THEN '' ELSE CONVERT(varchar(10), fechaEnvioFelicitacion, 120) END fechaEnvioFelicitacion,
        CASE WHEN fechaEnvioFelicitacion IS NULL OR YEAR(fechaEnvioFelicitacion) = 1900 THEN '' ELSE CONVERT(varchar(5), fechaEnvioFelicitacion, 108) END horaEnvioFelicitacion,
        CASE WHEN fechaEnvioSugerencia IS NULL OR YEAR(fechaEnvioSugerencia) = 1900 THEN '' ELSE CONVERT(varchar(10), fechaEnvioSugerencia, 120) END fechaEnvioSugerencia,
        CASE WHEN fechaEnvioSugerencia IS NULL OR YEAR(fechaEnvioSugerencia) = 1900 THEN '' ELSE CONVERT(varchar(5), fechaEnvioSugerencia, 108) END horaEnvioSugerencia,
        CASE WHEN fechaEnvioQueja IS NULL OR YEAR(fechaEnvioQueja) = 1900 THEN '' ELSE CONVERT(varchar(10), fechaEnvioQueja, 120) END fechaEnvioQueja,
        CASE WHEN fechaEnvioQueja IS NULL OR YEAR(fechaEnvioQueja) = 1900 THEN '' ELSE CONVERT(varchar(5), fechaEnvioQueja, 108) END horaEnvioQueja,
        encargado, seguimiento,
        CASE WHEN fechaSeguimiento IS NULL OR YEAR(fechaSeguimiento) = 1900 THEN '' ELSE CONVERT(varchar(10), fechaSeguimiento, 120) END fechaSeguimiento,
        CASE WHEN fechaSeguimiento IS NULL OR YEAR(fechaSeguimiento) = 1900 THEN '' ELSE CONVERT(varchar(5), fechaSeguimiento, 108) END horaSeguimiento,
        solucion,
        CASE WHEN fechaSolucion IS NULL OR YEAR(fechaSolucion) = 1900 THEN '' ELSE CONVERT(varchar(10), fechaSolucion, 120) END fechaSolucion,
        CASE WHEN fechaSolucion IS NULL OR YEAR(fechaSolucion) = 1900 THEN '' ELSE CONVERT(varchar(5), fechaSolucion, 108) END horaSolucion,
        CASE WHEN evidenciaSolucion IS NULL THEN '' ELSE evidenciaSolucion END evidenciaSolucion,
        CONVERT(varchar(16), fecha, 120) fecha, idMotivo,
        CASE WHEN clasificacion='Q' AND idMotivo IS NULL THEN 'Pend' ELSE '' END estatus, idResponsable,
        CASE WHEN fNotifResponsable IS NULL OR YEAR(fNotifResponsable) = 1900 THEN '' ELSE CONCAT( CONVERT(varchar(10), fNotifResponsable, 105), ' ', CONVERT(varchar(5), fNotifResponsable, 108) ) END fNotifResponsable,
        txtInvestigacion,
        CASE WHEN fInvestigacion IS NULL OR YEAR(fInvestigacion) = 1900 THEN '' ELSE CONCAT( CONVERT(varchar(10), fInvestigacion, 105), ' ', CONVERT(varchar(5), fInvestigacion, 108) ) END fInvestigacion,
        txtLlamadaTel,
        CASE WHEN fLlamadaTel IS NULL OR YEAR(fLlamadaTel) = 1900 THEN '' ELSE CONCAT( CONVERT(varchar(10), fLlamadaTel, 105), ' ', CONVERT(varchar(5), fLlamadaTel, 108) ) END fLlamadaTel,
        ISNULL(txtEmail, '') txtEmail,
        CASE WHEN fEnvioTxtEmail IS NULL OR YEAR(fEnvioTxtEmail) = 1900 THEN '' ELSE CONCAT( CONVERT(varchar(10), fEnvioTxtEmail, 105), ' ', CONVERT(varchar(5), fEnvioTxtEmail, 108) ) END fEnvioTxtEmail,
        ISNULL(txtAccionesAplicadas, '') txtAccionesAplicadas,
        CASE WHEN fAccionesAplicadas IS NULL OR YEAR(fAccionesAplicadas) = 1900 THEN '' ELSE CONCAT( CONVERT(varchar(10), fAccionesAplicadas, 105), ' ', CONVERT(varchar(5), fAccionesAplicadas, 108) ) END fAccionesAplicadas,
        ISNULL(aplica, '') aplica, ISNULL(cierre, '') cierre, ISNULL(evidenciaSolucion, '') evidenciaSolucion,
        CASE WHEN fCierre IS NULL OR YEAR(fCierre) = 1900 THEN '' ELSE CONCAT( CONVERT(varchar(10), fCierre, 105), ' ', CONVERT(varchar(5), fCierre, 108) ) END fCierre

      FROM surveys
      WHERE 1=1
    `

    // Clasificación
    if (req.query.clasificacion && req.query.clasificacion != "" && req.query.clasificacion != 'Todas') {
      qry += `
        AND (clasificacion = '${req.query.clasificacion.substr(0, 1)}')
      `
    }
    // Sucursal
    if (req.query.nombreSucursal && req.query.nombreSucursal != "" && req.query.nombreSucursal != '- Todas -') {
      qry += `
        AND (nombreSucursal = '${req.query.nombreSucursal}')
      `
    }
    // Rango de fechas
    if (req.query.desde && req.query.desde != "") {
      qry += `
        AND (CONVERT(varchar(10), fecha, 120) BETWEEN '${req.query.desde}'  AND '${req.query.hasta}' )
      `
    }
    // Una sola encuesta y debe ser clasificación = Queja
    if (req.query.responseId) {
      qry += `
        AND (responseId = '${req.query.responseId}')
      `
    }

    qry += `
      ORDER BY responseId DESC
    `
    results = await sql.query(qry)
    results = await results[0]

    json.result = (results.length > 0) ? 200 : 500
    json.msg = (results.length > 0) ? "Ok" : "Sin registros"
    json.records = results.length
    json.data = results

    qry = `SELECT (SELECT TOP 1 CONVERT(varchar(10), fecha, 120) FROM surveys ORDER BY fecha) fechaInicial,
                  (SELECT TOP 1 CONVERT(varchar(10), fecha, 120) FROM surveys ORDER BY fecha DESC) fechaFinal`
    results = await sql.query(qry)
    results = await results[0][0]
    json.rango = results

  } catch (err) {
    json.result = 403
    json.msg = ctrlError(err, req.route, req.route.path)

  } finally {
    res.json(json)

  }

}) //api/responses


// Actualizar comité por Clasificación en la BD
app.use("/api/comite/:clasificacion", mdi, (req, res) => {
  let json = {}
  let insertValues = ''
  for (let index = 0; index < req.body.comite.length; index++) {  // Lleno la cadena de insertValues por cada elemento de arrValues
    insertValues += (index == 0) ? '' : ', '
    insertValues += `(REPLACE(NEWID(), '-', ''), '${req.params.clasificacion}',  '${req.body.comite[index].empleado_codigo}', GETDATE())`
  }
  let qry = `
    DELETE FROM comite WHERE clasificacion = '${req.params.clasificacion}';
    INSERT INTO comite ( oid, clasificacion, representante, fecha )
    VALUES ${insertValues} ;
  `
  sql.query(qry).then(([results, metadata]) => {
    json.result = 200
    json.msg = "Ok"
    json.results = results
    json.metadata = metadata
  }).catch(err => {
    json.result = 403
    json.msg = (typeof err == 'object') ? JSON.stringify(err) : err
    json.results = []
    json.metadata
  }).finally(() => {
    res.json(json)
  })

}) // /api/comite


app.use("/api/comites/:clasificacion", mdi, async (req, res) => {
  let json = {}
  let results = []
  let qry = `
    SELECT clasificacion, representante
    FROM comite
    WHERE clasificacion = '${req.params.clasificacion}'
  `
  let codigos
  try {
    // 10.200.0.72 (antes 192.168.10.18) SQL Server - SurveyMonkey (comité por Clasificación)
    results = await sql.query(qry)
    json.result = 200
    json.results = results[0]
    json.msg = "Ok"
    codigos = json.results.map(({representante}) => representante).toString()

    // 10.200.0.56 MySQL -> rh (empleados)
    if (results.length > 0) {
      results = await axios({
        method: "get",
        url: "http://icertus.com.mx:84/rh/servidor/svr_empleados.php/",
        params: {
          o: "select",
          codigos: codigos
        }
      })
      json.empleados = await results.data.empleados
    } // Si results.length > 0

  } catch(err) {
    json.result = 403
    json.msg = (typeof err == 'object') ? JSON.stringify(err) : err
    json.results = []
    json.empleados = []
  } finally {
    res.json(json)
  }

}) // /api/comites


// Sucursales
app.get("/api/sucursales", mdi, (req, res) => {
  let json = {}
  let qry = `
    SELECT '- Todas -' nombreSucursal
    UNION
    SELECT DISTINCT nombreSucursal FROM surveys
    ORDER BY nombreSucursal
  `
  sql.query(qry).then(([results]) => {
    json.result = 200
    json.data = results.map(v => v.nombreSucursal)
    json.msg = "Ok"
  }).catch(error =>{
    json.result = 403
    json.data = []
    json.msg = ctrlError(error, req.route.stack[0].method, req.route.path)
  }).finally(() => {
    res.json(json)
  })
}) // Sucursales


app.use("/api/procesa-encuestas", mdi, (req, res) => {
  res.end('Procesamiento de encuestas')
  procesarEncuestas()
}) // /api/procesa-encuestas


// Categorias de Quejas
app.get("/api/categorias/quejas", mdi, (req, res) => {
  let json = {}
  let qry = `
    SELECT id, nombre, dimension
    FROM motivosQuejas
    ORDER BY nombre
  `
  sql.query(qry).then(([results]) => {
    json.result = 200
    json.data = results
    json.msg = "Ok"
  }).catch(error =>{
    json.result = 403
    json.data = []
    json.msg = ctrlError(error, req.route.stack[0].method, req.route.path)
  }).finally(() => {
    res.json(json)
  })
}) // /categorias/quejas


// POST asignación de categoria de la queja
app.post("/api/encuesta/categoria/:responseId", mdi, (req, res) => {
  let json = {}
  let qry = `
    UPDATE surveys
    SET idMotivo = '${req.body.idMotivo}'
    WHERE responseId = '${req.params.responseId}'
  `
  sql.query(qry).then(([results, metadata]) => {
    json.result = 200
    json.data = results
    json.metadata = metadata
    json.msg = "Ok"
  }).catch(error =>{
    json.result = 403
    json.data = []
    json.metadata = []
    json.msg = ctrlError(error, req.route.stack[0].method, req.route.path)
  }).finally(() => {
    res.json(json)
  })
}) // /encuesta/categoria/:responseId


// Responsables
app.get("/api/responsables", mdi, (req, res) => {
  let json = {}
  let qry = `
    SELECT id, nombre, email, ISNULL(rol, '') rol
    FROM responsables
    ORDER BY nombre
  `
  sql.query(qry).then(([results]) => {
    json.result = 200
    json.data = results
    json.msg = "Ok"
  }).catch(error =>{
    json.result = 403
    json.data = []
    json.msg = ctrlError(error, req.route.stack[0].method, req.route.path)
  }).finally(() => {
    res.json(json)
  })
}) // /api/responsables


// POST asignación de categoria de la queja
app.post("/api/encuesta/responsable/:responseId", mdi, (req, res) => {
  let json = {}
  let qry = `
    UPDATE surveys
    SET idResponsable = '${req.body.idResponsable}'
    WHERE responseId = '${req.params.responseId}'
  `
  sql.query(qry).then(([results, metadata]) => {
    json.result = 200
    json.data = results
    json.metadata = metadata
    json.msg = "Ok"
  }).catch(error =>{
    json.result = 403
    json.data = []
    json.metadata = []
    json.msg = ctrlError(error, req.route.stack[0].method, req.route.path)
  }).finally(() => {
    res.json(json)
  })
}) // /encuesta/responsable/:responseId


// GET envío de email para asignación a responsable de la queja
app.post("/api/notificacion/asigna-responsable", mdi, (req, res) => {
  let fecha = new Date().toLocaleString('es-MX', {
    timeZone: 'America/Tijuana',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(/\//g, '-')
  sendEmail({
    email: `${req.body.nombre} ${req.body.email}`,
    subject: `Asignación de Queja ${req.body.folioInterno} // Id ${req.body.responseId} // ${fecha}`,
    body: `
      <div style="font-size: 1.0em; font-family: Verdana">
        <h3>Hola ${req.body.nombre},</h3>
        <p>Se te ha asignado la Queja <strong>${req.body.folioInterno}</strong></p>
        <p>Para que realices el seguimiento da click <strong><a href='${config.frontendUrl}/encuestas/?responseId=${req.body.responseId}&id=${req.body.idResponsable}'>aquí</a></strong></p>
        <hr style="border: 3px solid #00468b;background-color:#00468b;border-radius: 2px;">
        <br>
        Gracias por tu apoyo.
      </div>
    `,
    cc: '',
    qry: ''
  }).then(enviado => {
    console.log("en promesa, enviado:", enviado)
    let json = {}
    if (enviado) {
      let qry = `
        UPDATE surveys
        SET fNotifResponsable = GETDATE()
        OUTPUT CONCAT( CONVERT(varchar(10), inserted.fNotifResponsable, 105), ' ', CONVERT(varchar(5), inserted.fNotifResponsable, 108) ) fNotifResponsable
        WHERE oid = '${req.body.oid}'
      `
      sql.query(qry).then(([results, metadata]) => {
        json.result = 200
        json.data = results[0]
        json.metadata = metadata
        json.msg = "Ok"
  /* REGRESAR data.fNotifResponsable ********************************************************************/
      }).catch(error =>{
        json.result = 403
        json.data = {}
        json.metadata = []
        json.msg = ctrlError(error, req.route.stack[0].method, req.route.path)
      }).finally(() => {
        res.json(json)
      })
    } else {
      res.json({
        result: 500,
        msg: 'Se detectó un inconveniente con el Servidor de Correo, no se ha podido enviar la Notificación',
        data: {}
      })
    }
  }) // sendEmail()

}) //  /api/notificacion/asigna-responsable


// GET Responsable
app.get("/api/responsable/:id", mdi, (req, res) => {
  let json = {}
  let qry = `
    SELECT nombre, email, ISNULL(rol, '') rol
    FROM responsables
    WHERE id = '${req.params.id}'
  `
  sql.query(qry).then(([results, metadata]) => {
    json.result = (results.length > 0) ? 200 : 500
    json.data = (results.length > 0) ? results[0] : {}
    json.msg = (results.length > 0) ? "Ok": "Registro inexistente"
  }).catch(error =>{
    json.result = 403
    json.data = []
    json.msg = ctrlError(error, req.route.stack[0].method, req.route.path)
  }).finally(() => {
    res.json(json)
  })
}) // /api/responsable/:id


// Encuestas por clasificación y rango de fechas
app.get("/api/encuestas-clasificacion", mdi, async (req, res) => {
  let json = {}
  let results = []
  let qry
  let hoy = new Date()
  let desde = new Date()
  let hasta = new Date()

  desde = (desde.setDate(hoy.getDate() - 31))
  desde = new Date(desde).toLocaleDateString('ja-JP', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/\//g, '-')
  hasta = hoy.toLocaleDateString('ja-JP', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/\//g, '-')

  console.log('Rango', hoy, desde)

  try {
    qry = `
      SELECT
        COUNT( CASE WHEN clasificacion = 'F' THEN 1 ELSE NULL END ) 'Felicitaciones',
        COUNT( CASE WHEN clasificacion = 'S' THEN 1 ELSE NULL END ) 'Sugerencias',
        COUNT( CASE WHEN clasificacion = 'Q' THEN 1 ELSE NULL END ) 'Quejas'
      FROM surveys
      WHERE CONVERT(varchar(10), fecha, 120) BETWEEN '${desde}' AND '${hasta}'
    `
    // Primer resultado -> Mensual
    results = await sql.query(qry)
    json.result = (results[0].length > 0) ? 200 : 500
    json.msg = (results[0].length > 0) ? "Ok": "No se encontraron registros"
    json.data = {}
    json.data.mensual = results[0][0]
    json.data.mensual.rango = {
      desde: desde,
      hasta: hasta
    }
    // Segundo resultado -> Semanal
    desde = hoy
    desde = new Date( desde.setDate(hoy.getDate() - 6) )
    .toLocaleDateString('ja-JP', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/\//g, '-')
    qry = `
      SELECT
        COUNT( CASE WHEN clasificacion = 'F' THEN 1 ELSE NULL END ) 'Felicitaciones',
        COUNT( CASE WHEN clasificacion = 'S' THEN 1 ELSE NULL END ) 'Sugerencias',
        COUNT( CASE WHEN clasificacion = 'Q' THEN 1 ELSE NULL END ) 'Quejas'
      FROM surveys
      WHERE CONVERT(varchar(10), fecha, 120) BETWEEN '${desde}' AND '${hasta}'
    `
    results = await sql.query(qry)
    json.data.semanal = results[0][0]
    json.data.semanal.rango = {
      desde: desde,
      hasta: hasta
    }
    // Tercer resultado -> dia actual
    hoy = hoy.toLocaleDateString('ja-JP', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/\//g, '-')
    qry = `
      SELECT
        COUNT( CASE WHEN clasificacion = 'F' THEN 1 ELSE NULL END ) 'Felicitaciones',
        COUNT( CASE WHEN clasificacion = 'S' THEN 1 ELSE NULL END ) 'Sugerencias',
        COUNT( CASE WHEN clasificacion = 'Q' THEN 1 ELSE NULL END ) 'Quejas'
      FROM surveys
      WHERE CONVERT(varchar(10), fecha, 120) = '${hoy}'
    `
    results = await sql.query(qry)
    json.data.hoy = results[0][0]
    json.data.hoy.rango = {
      hoy: hoy
    }

  } catch (error) {
    json.result = 403
    json.data = []
    json.msg = ctrlError(error, req.route.stack[0].method, req.route.path)

  } finally {
    res.json(json)

  }

}) // /api/encuestas-clasificacion


// Encuestas por tipo
app.get("/api/encuestas-dashboard", mdi, (req, res) => {
  let json = {}
  let hasta = new Date().toLocaleDateString('ja-JP', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/\//g, '-')
  let desde = new Date() // `${hasta.substring(0, 4)}-${hasta.substring(5, 7)}-01`
  desde = desde.setDate(desde.getDate() - 31)
  desde = new Date(desde).toLocaleDateString('ja-JP', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/\//g, '-')
  let qry = `
    SELECT
      folioInterno, surveyId, responseId, collectorId, orden, CONVERT(varchar(16), fechaOrden, 120) fechaOrden, recepcionista,
      flebotomista, nombreSucursal, CONVERT(varchar(16), fechaEntrega, 120) fechaEntrega, nombrePaciente, apellidosPaciente, emailPaciente,
      CASE clasificacion WHEN 'F' THEN 'Felicitación' WHEN 'S' THEN 'Sugerencia' WHEN 'Q' THEN 'Queja' END clasificacion,
      CASE clasificacion WHEN 'F' THEN '1' WHEN 'S' THEN '2' WHEN 'Q' THEN '3' END numClasificacion,
      respuesta, CONVERT(varchar(16), fecha, 120) fechaEncuesta
    FROM surveys
    WHERE
      ( CONVERT(varchar(10), fecha, 120) BETWEEN '${desde}' AND '${hasta}' ) AND
      ( clasificacion != '' )
    ORDER BY fecha
  `
  sql.query(qry).then(([results, metadata]) => {
    json.result = 200
    json.records = results.length
    json.data = results
  }).catch(error => {
    json.result = 404
    json.records = 0
    json.data = ctrlError(error, req.route.stack[0].method, req.route.path)
  }).finally(() => {
    res.json(json)
  })
}) // /api/encuestas-dashboard


// Cantidad de encuestas por tipo desglosado por sucursal y mes
app.get("/api/encuestas-anuales-sucursal", mdi, async (req, res) => {
  let json = {}
  let aMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  let sucursales = []
  let results = []
  let resultados = []
  let qry

  try {

    // Sucursales
    qry = `
      SELECT DISTINCT nombreSucursal
      FROM surveys
      WHERE ( YEAR(fecha) = YEAR(GETDATE()) )
      ORDER BY nombreSucursal
    `
    sucursales = await sql.query(qry)
    sucursales = sucursales[0]

    // Encuestas
    qry = `
      SELECT
        nombreSucursal,
        DATEPART(MM, fecha) mes,
        CASE DATEPART(MM, fecha)
          WHEN  1 THEN 'Ene'
          WHEN  2 THEN 'Feb'
          WHEN  3 THEN 'Mar'
          WHEN  4 THEN 'Abr'
          WHEN  5 THEN 'May'
          WHEN  6 THEN 'Jun'
          WHEN  7 THEN 'Jul'
          WHEN  8 THEN 'Ago'
          WHEN  9 THEN 'Sep'
          WHEN 10 THEN 'Oct'
          WHEN 11 THEN 'Nov'
          WHEN 12 THEN 'Dic'
        END nombreMes,
        COUNT(CASE WHEN clasificacion = 'F' THEN 1 ELSE null END) 'Felicitaciones',
        COUNT(CASE WHEN clasificacion = 'S' THEN 1 ELSE null END) 'Sugerencias',
        COUNT(CASE WHEN clasificacion = 'Q' THEN 1 ELSE null END) 'Quejas'
      FROM surveys
      WHERE
        ( YEAR(fecha) = YEAR(GETDATE()) ) AND
        ( clasificacion != '' )
      GROUP BY nombreSucursal, DATEPART(MM, fecha)
      ORDER BY nombreSucursal, mes
    `
    results = await sql.query(qry)
    results = results[0]
    json.result = 200

    let found
    let idx = 0

    // Recorro el arreglo results
    resultados = []
    for (const iterator of sucursales) {
      resultados.push({
        sucursal: iterator.nombreSucursal
      })
      idx = resultados.length -1  // indice actual del arreglo principal -> resultados
      // formo los meses por la sucursal iterada
      for (let mes = 1; mes <= 12; mes++) {
        let strMes = aMeses[mes -1]
        resultados[idx][strMes] = strMes  // Creo nodo dinámico con el nombre del mes
        found = results.find(v => (v.nombreSucursal == iterator.nombreSucursal && v.mes == mes)) // busco la info
        if (found) {
          resultados[idx][strMes] = {
            Felicitaciones: found.Felicitaciones,
            Sugerencias: found.Sugerencias,
            Quejas: found.Quejas
          }
        } else {
          resultados[idx][strMes] = {
            Felicitaciones: 0,
            Sugerencias: 0,
            Quejas: 0
          }
        }
      } // for mes
    } // for iterator

    json.records = resultados.length
    json.data = resultados

  } catch (error) {
    json.result = 404
    json.records = 0
    json.data = ctrlError(error, req.route.stack[0].method, req.route.path)

  } finally {
    res.json(json)

  }

}) // /api/encuestas-anuales-sucursal


// /api/investigacion Actualizar la fase de Investigación
app.put("/api/investigacion/:responseId", mdi, async (req, res) => {
  let json = {}
  let jsonEmail = {}
  let qry = ''
  let results = []
  let administradores = null
  let responsable = {
    id: '',
    nombre: '- Sin Asignar -' ,
    email: 'oscar.perez@certuslab.com.mx', // default
    results: []
  }

  try {
    // Administradores de las quejas (se enviará un correo adicional a los administradores para asignar al responsable)
    qry = `
      SELECT CONCAT(nombre, ' ', email) responsable
      FROM responsables
      WHERE rol = 'A'
    `
    administradores = await sql.query(qry)
    administradores = administradores[0].map(v => v.responsable).toString()
//administradores = 'Oscar Pérez oscar.perez@certuslab.com.mx'

    qry = `
      UPDATE surveys
      SET txtInvestigacion = '${req.body.txtInvestigacion}',
        fInvestigacion = GETDATE(),
        fNotifResponsable = GETDATE()
      OUTPUT inserted.idResponsable,
             CONCAT( CONVERT(varchar(10), inserted.fInvestigacion, 105), ' ', CONVERT(varchar(5), inserted.fInvestigacion, 108) ) fInvestigacion
      WHERE responseId = '${req.params.responseId}'
    `
    results = await sql.query(qry)
    json.data = {}
    if (results[0][0] != undefined) {
      json.data = results[0][0]
      // Leo el nombre e email del responsable para enviarle la notificación con copia a los administradores
      responsable.id = (results[0][0].idResponsable == undefined) ? '' : results[0][0].idResponsable
      qry = `
        SELECT nombre, email FROM responsables WHERE id = '${responsable.id}'
      `
      responsable.results = await sql.query(qry)
      if (responsable.results[0][0] != undefined) {
        responsable.nombre = responsable.results[0][0].nombre
        responsable.email = responsable.results[0][0].email
//responsable.email = 'oscar.perez@certuslab.com.mx'
      }
    }
    json.result = 200
    json.metadata = results[1]
    json.msg = "Ok"
    // jsonEmail
    jsonEmail.email = responsable.email
    jsonEmail.cc = administradores
    jsonEmail.clasificacion = 'Q'
    jsonEmail.subject = `Queja #${req.params.responseId} // Actualización // Fase de Investigación`
    jsonEmail.body = `
      <p>La Queja #${req.params.responseId} ha sido actualizada en la fase de Investigación</p>
      <p>Responsable: <strong>${responsable.nombre}</strong></p>
      <hr>
      <p>${req.body.txtInvestigacion}</p>
    `
    jsonEmail.qry = ''

/*
Error: TypeError: Cannot read properties of undefined (reading '0')
    at file:///C:/dev/quasar/c-xp2/api/index.js:1762:37
    at processTicksAndRejections (node:internal/process/task_queues:96:5)
Pausando timer 25/05/2022, 18:15:05
Iniciando envío 2022-05-25 6:15:05 p.m. email oscar.perez@certuslab.com.mx subject Queja #13475887947 // Error // Fase de Investigación
*/



  } catch (error) {
console.log('Error:', error)
    json.result = 403
    json.data = []
    json.metadata = []
    json.msg = String(error) //ctrlError(error, req.route.stack[0].method, req.route.path)
    // jsonEmail
    jsonEmail.email = 'oscar.perez@certuslab.com.mx'
    jsonEmail.cc = ''
    jsonEmail.clasificacion = 'Q'
    jsonEmail.subject = `Queja #${req.params.responseId} // Error // Fase de Investigación`
    jsonEmail.body = `${error.message} <br> <pre>${error}</pre>`
    jsonEmail.qry = ''

  } finally {
    res.json(json)
    sendEmail(jsonEmail)
  }

}) // /api/investigacion/:responseId


// /api/atencion-paciente => Actualizar la fase de Atención al Paciente
app.put("/api/atencion-paciente/:responseId", mdi, async (req, res) => {
  let json = {}
  let jsonEmail = {}
  let qry = ''
  let results = []
  let administradores = null
  let responsable = {
    id: '',
    nombre: '- Sin Asignar -' ,
    email: 'oscar.perez@certuslab.com.mx', // default
    results: []
  }

  try {
    // Administradores de las quejas (se enviará un correo adicional a los administradores para asignar al responsable)
    qry = `
      SELECT CONCAT(nombre, ' ', email) responsable
      FROM responsables
      WHERE rol = 'A'
    `
    administradores = await sql.query(qry)
    administradores = administradores[0].map(v => v.responsable).toString()
//administradores = 'Oscar Pérez oscar.perez@certuslab.com.mx'

    qry = `
      UPDATE surveys
      SET txtLlamadaTel = '${req.body.txtLlamadaTel}',
          txtEmail = '${req.body.txtEmail}',
          fLlamadaTel = GETDATE(),
          fEnvioTxtEmail = GETDATE(),
          fNotifResponsable = GETDATE()
      OUTPUT inserted.idResponsable,
             CONCAT( CONVERT(varchar(10), inserted.fEnvioTxtEmail, 105), ' ', CONVERT(varchar(5), inserted.fEnvioTxtEmail, 108) ) fEnvioTxtEmail
      WHERE responseId = '${req.params.responseId}'
    `
    results = await sql.query(qry)
    json.data = {}
    if (results[0][0] != undefined) {
      json.data = results[0][0]
      // Leo el nombre e email del responsable para enviarle la notificación con copia a los administradores
      responsable.id = (results[0][0].idResponsable == undefined) ? '' : results[0][0].idResponsable
      qry = `
        SELECT nombre, email FROM responsables WHERE id = '${responsable.id}'
      `
      responsable.results = await sql.query(qry)
      if (responsable.results[0][0] != undefined) {
        responsable.nombre = responsable.results[0][0].nombre
        responsable.email = responsable.results[0][0].email
//responsable.email = 'oscar.perez@certuslab.com.mx'
      }
    }
    json.result = 200
    json.metadata = results[1]
    json.msg = "Ok"
    // jsonEmail
    jsonEmail.email = responsable.email
    jsonEmail.cc = administradores
    jsonEmail.clasificacion = 'Q'
    jsonEmail.subject = `Queja #${req.params.responseId} // Actualización // Fase de Atención al Paciente`
    jsonEmail.body = `
      <div style="font-family: Verdana;font-size: 1.2em">
        <p>La Queja #${req.params.responseId} ha sido actualizada en la fase de Atención al Paciente</p>
        <p>Responsable: <strong>${responsable.nombre}</strong></p>
        <hr>
        <p>${req.body.txtEmail}</p>
      </div>
    `
    jsonEmail.qry = ''

/*
Error: TypeError: Cannot read properties of undefined (reading '0')
    at file:///C:/dev/quasar/c-xp2/api/index.js:1762:37
    at processTicksAndRejections (node:internal/process/task_queues:96:5)
Pausando timer 25/05/2022, 18:15:05
Iniciando envío 2022-05-25 6:15:05 p.m. email oscar.perez@certuslab.com.mx subject Queja #13475887947 // Error // Fase de Investigación
*/

  } catch (error) {
console.log('Error:', error)
    json.result = 403
    json.data = []
    json.metadata = []
    json.msg = String(error) //ctrlError(error, req.route.stack[0].method, req.route.path)
    // jsonEmail
    jsonEmail.email = 'oscar.perez@certuslab.com.mx'
    jsonEmail.cc = ''
    jsonEmail.clasificacion = 'Q'
    jsonEmail.subject = `Queja #${req.params.responseId} // Error // Fase de Investigación`
    jsonEmail.body = `${error.message} <br> <pre>${error}</pre>`
    jsonEmail.qry = ''

  } finally {
    res.json(json)
    sendEmail(jsonEmail)
  }

}) // /api/investigacion/:responseId


// /api/acciones-aplicadas => Actualizar la fase de Atención al Paciente
app.put("/api/acciones-aplicadas/:responseId", mdi, async (req, res) => {
  let json = {}
  let jsonEmail = {}
  let qry = ''
  let results = []
  let administradores = null
  let responsable = {
    id: '',
    nombre: '- Sin Asignar -' ,
    email: 'oscar.perez@certuslab.com.mx', // default
    results: []
  }

  try {
    // Administradores de las quejas (se enviará un correo adicional a los administradores para asignar al responsable)
    qry = `
      SELECT CONCAT(nombre, ' ', email) responsable
      FROM responsables
      WHERE rol = 'A'
    `
    administradores = await sql.query(qry)
    administradores = administradores[0].map(v => v.responsable).toString()
//administradores = 'Oscar Pérez oscar.perez@certuslab.com.mx'

    qry = `
      UPDATE surveys
      SET txtAccionesAplicadas = '${req.body.txtAccionesAplicadas}',
          fAccionesAplicadas = GETDATE()
      OUTPUT inserted.idResponsable,
          CONCAT( CONVERT(varchar(10), inserted.fAccionesAplicadas, 105), ' ', CONVERT(varchar(5), inserted.fAccionesAplicadas, 108) ) fAccionesAplicadas
      WHERE responseId = '${req.params.responseId}'
    `
    results = await sql.query(qry)
    json.data = {}
    if (results[0][0] != undefined) {
      json.data = results[0][0]
      // Leo el nombre e email del responsable para enviarle la notificación con copia a los administradores
      responsable.id = (results[0][0].idResponsable == undefined) ? '' : results[0][0].idResponsable
      qry = `
        SELECT nombre, email FROM responsables WHERE id = '${responsable.id}'
      `
      responsable.results = await sql.query(qry)
      if (responsable.results[0][0] != undefined) {
        responsable.nombre = responsable.results[0][0].nombre
        responsable.email = responsable.results[0][0].email
//responsable.email = 'oscar.perez@certuslab.com.mx'
      }
    }
    json.result = 200
    json.metadata = results[1]
    json.msg = "Ok"
    // jsonEmail
    jsonEmail.email = responsable.email
    jsonEmail.cc = administradores
    jsonEmail.clasificacion = 'Q'
    jsonEmail.subject = `Queja #${req.params.responseId} // Actualización // Fase de Acciones Aplicadas`
    jsonEmail.body = `
      <div style="font-family: Verdana;font-size: 1.2em">
        <p>La Queja #${req.params.responseId} ha sido actualizada en la fase de Acciones Aplicadas</p>
        <p>Responsable: <strong>${responsable.nombre}</strong></p>
        <hr>
        <p>${req.body.txtAccionesAplicadas}</p>
      </div>
    `
    jsonEmail.qry = ''

  } catch (error) {
console.log('Error:', error)
    json.result = 403
    json.data = []
    json.metadata = []
    json.msg = String(error) //ctrlError(error, req.route.stack[0].method, req.route.path)
    // jsonEmail
    jsonEmail.email = 'oscar.perez@certuslab.com.mx'
    jsonEmail.cc = ''
    jsonEmail.clasificacion = 'Q'
    jsonEmail.subject = `Queja #${req.params.responseId} // Error // Fase de Acciones Aplicadas`
    jsonEmail.body = `${error.message} <br> <pre>${error}</pre>`
    jsonEmail.qry = ''

  } finally {
    res.json(json)
    sendEmail(jsonEmail)
  }

}) // /api/acciones-aplicadas/:responseId


// Ruta para recibir los archivos adjuntos
app.use("/api/upload/:responseId", mdi, async (req, res) => {
  let json = {
    responseId: req.params.responseId
  }
  let jsonEmail = {}
  try {
    const form = new formidable.IncomingForm()
    form.uploadDir = path.join(__dirname, req.params.responseId)

    if (!fs.existsSync(form.uploadDir)) {
      fs.mkdirSync(form.uploadDir, '0777')
    }
    console.log("uploadDir", form.uploadDir)
    form.parse(req, (_, fields, files) => {
      let json = files[Object.keys(files)]
      console.log('parse', '\n-----------')
      // Renombro el archivo temporal como el nombre original
      fs.renameSync(`${form.uploadDir}/${json.newFilename}`, `${form.uploadDir}/${json.originalFilename}`)
      /*
      files =  {
        'PEAO650730ET3_W5KEUB_161143171_I.pdf': PersistentFile {
          _events: [Object: null prototype] { error: [Function (anonymous)] },
          _eventsCount: 1,
          _maxListeners: undefined,
          lastModifiedDate: 2022-06-14T00:03:52.129Z,
          filepath: 'C:\\dev\\quasar\\c-xp2\\api\\files\\3845729eedc8063c359824000',
          newFilename: '3845729eedc8063c359824000',
          originalFilename: 'PEAO650730ET3_W5KEUB_161143171_I.pdf',
          mimetype: 'application/pdf',
          hashAlgorithm: false,
          size: 85302,
          _writeStream: WriteStream {
            fd: 4,
            path: 'C:\\dev\\quasar\\c-xp2\\api\\files\\3845729eedc8063c359824000',
            flags: 'w',
            mode: 438,
            start: undefined,
            pos: undefined,
            bytesWritten: 85302,
            closed: false,
            _writableState: [WritableState],
            _events: [Object: null prototype],
            _eventsCount: 1,
            _maxListeners: undefined,
            [Symbol(kFs)]: [Object],
            [Symbol(kIsPerformingIO)]: false,
            [Symbol(kCapture)]: false
          },
          hash: null,
          [Symbol(kCapture)]: false
        }
      }
      */

      json.response = 200
      json.message = 'Ok'
      json.data = Object.keys(files)
      json.source = "parse"

    })

    form.on('error', function(err) {
      console.log("an error has occured with form upload")
      console.log(err)
      request.resume()
      json.response = 400
      json.message = 'Se detectó un error'
      json.data = err
      json.source = "error"
    })

    form.on('aborted', function(err) {
      console.log("user aborted upload");
      json.response = 400
      json.message = 'Carga cancelada por el usuario'
      json.data = err
      json.source = "aborted"
    })

    form.on('end', function() {
      console.log('-> upload done');
      if (!json.response) {
        json.response = 200
        json.message = 'Archivo cargado correctamente'
        json.data = ''
        json.source = "end"
      }
      if (!res.headersSent) {
        res.json(json)
      }

    })

  } catch (error) {
    console.log('Error en catch:', error, '\n---------------------------')
    const error_message = (error.message || 'Indefinido')
    console.log(error)
    if (!res.headersSent) {
        res.json({
        response: 404,
        message: error_message,
        data: '',
        source: 'catch error'
      })
    }
  } finally {
    console.log("Final ***************")
  }

}) // /api/upload/:responseId


// Leer y regresar el contenido de la carpeta en caso de que exista, archivos cargados
app.get("/api/getFolderContent/:responseId", mdi, (req, res) => {

  let json = {}
  let files = []
  let index = 0
  const folder = path.join(__dirname, req.params.responseId)

  try {
    // Verifico la existencia de la carpeta de acuerdo al Id de encuesta (req.params.responseId)
    if (fs.existsSync(req.params.responseId)) {
      // Leo los archivos adjuntos
      fs.readdirSync(folder).forEach(file => {
        index++
        files.push({
          id: index,
          file: file,
          responseId: req.params.responseId
        })
      })
    }
    json.response = 200
    json.message = `Archivos adjuntos: ${files.length}`
    json.data = files

  } catch (error) {
    console.log("Error:", error.message)
    json.response = 404
    json.message = "No se han cargado documentos"
    json.data = error

  } finally {
    res.json(json)

  }

  //res.download(fileToDownload)

  //console.log('sendFile')
  //res.sendFile(fileToDownload)

  /* Abrir en el navegador
  fs.readFile(fileToDownload , function (err, data) {
    res.contentType("application/pdf")
    //res.send(data)
    fs.createReadStream(fileToDownload).pipe(res)
  })
*/


//  console.log('files', files)

}) // /api/getFolderContent/:responseId

// Leer y mostrar documento en el navegador
app.get("/api/openPdf/:responseId/:pdf", mdi, (req, res) => {
  let json = {}
  const folder = path.join(__dirname, req.params.responseId)
  const pdf = path.join(folder, req.params.pdf)
  try {
    json.response = 200
    json.message = "Ok"
    json.data = req.params.pdf
  } catch (error) {
    json.response = 404
    json.message = error.message
    json.data = ""
  } finally {
    if (json.response == 200) {
      fs.readFile(pdf , function (err, data) {
        res.contentType("application/pdf")
        //res.send(data)
        fs.createReadStream(pdf).pipe(res)
      })
    }
    if (!res.sendStatus) {
      res.json(json)
    }
  }
})

// Borrar un documento archivado
app.delete("/api/delete-file/:responseId/:pdf", mdi, (req, res) => {
  let json = {}
  const folder = path.join(__dirname, req.params.responseId)
  const pdf = path.join(folder, req.params.pdf)
  try {
    json.response = 200
    json.message = "Archivo borrado correctamente"
    fs.unlinkSync(pdf)
  } catch (error) {
    json.response = 404
    json.message = error.message
  } finally {
    res.json(json)
  }
}) // /api/delete-file/:responseId/:pdf


app.put("/api/acciones-aplicadas-cierre/:responseId", mdi, (req, res) => {
  let json = {}
  let qry = `
    UPDATE surveys
    SET aplica = '${req.body.aplica}',
        cierre = '${req.body.cierre}',
        fCierre = GETDATE()
    OUTPUT inserted.idResponsable,
        CONCAT( CONVERT(varchar(10), inserted.fCierre, 105), ' ', CONVERT(varchar(5), inserted.fCierre, 108) ) fCierre
    WHERE responseId = '${req.params.responseId}'
  `
  sql.query(qry).then(results => {
    console.log("results", results)
    json.response = 200
    json.msg = "Ok"
    json.data = results[0][0]
    json.metadata = results[1]
  }).catch(error => {
    json.response = 404
    json.msg = error
    json.data = []
    json.metadata = []
  }).finally(() => {
    res.json(json)
  })
})


function timer(action) {
  if (action == "ON") {
    console.log("Iniciando timer", new Date().toLocaleString('en-CA', { timeZone: "America/Tijuana" }))
    myInterval = setInterval(() => {
      let timeStamp = new Date().toLocaleTimeString('fr-FR', { timeZone: "America/Tijuana" })  // Regresa HH:ii:ss
      //(timeStamp.substr(3,5) == "00:00" && (timeStamp >= "07:00:00" && timeStamp <= "22:00:00")) {
      if ((timeStamp === "07:00:00") || (timeStamp === "11:00:00") || (timeStamp === "15:00:00") || (timeStamp === "19:00:00") || (timeStamp === "23:00:00")) {
        console.log("setInterval()", timeStamp)
        syncDelay(1200)
        procesarEncuestas()
      }
      if (timeStamp.substr(3,5) === "05:00") {  // "05:00"
        syncDelay(1200)
        procesarEnvios("Q") // Quejas
      }
      if (timeStamp.substr(3,5) === "10:00") {  // "10:00"
        syncDelay(1200)
        procesarEnvios("S") // Sugerencias
      }
      if (timeStamp == "22:15:00") {
        syncDelay(1200)
        procesarEnvios("F") // Felicitaciones
      }
    }, 1000)
  } else { // "OFF"
    console.log("Pausando timer", new Date().toLocaleString('fr-FR', { timeZone: "America/Tijuana" }))
    clearInterval(myInterval)
  }
}

app.listen(port, () => console.log(`API C-XP ejecutando en el puerto ${port}`))

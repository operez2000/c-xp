import { ssrMiddleware } from 'quasar/wrappers'
import express, { response } from 'express'
import Sequelize from 'sequelize'
import axios from 'axios'
import fs from 'fs'
import sha1 from 'sha1'

const sql = new Sequelize({
  host: '192.168.10.18',
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

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/developing-ssr/ssr-middlewares
export default ssrMiddleware(async ({ app /*, resolveUrlPath, publicPath, render */ }) => {

  // Body parser -> Express 
  app.use(express.json({ limit: '50mb', extended: true }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  
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
      json.result = 403
      json.msg = ""
      json.data = err
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
      json.result = 403
      json.msg = ""
      json.data = err
      json.url = url
    }).finally(() => {
      res.json(json)
    })

  }) // /api/collector-responses/:id  

  
  // Búsqueda de respuestas por encuesta
  app.use("/api/survey-responses/:id", mdi, (req, res) => {
    let json = {}

    // Informacion para leer la cantidad de respuestas en la API de SurveyMonkey
    let url = `${surveyMonkey.urlBase}/surveys/${req.params.id}/responses` 
    if (req.query.page) {
      // Si viene la página como parámetro entonces se hace el filtro correspondiente
      url += `/bulk/?page=${req.query.page}`
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
      json.result = 403
      json.msg = ""
      json.data = err
      json.url = url
    }).finally(() => {
      res.json(json)
    })

  }) // /api/survey-responses/:id  


  // Búsqueda de encuestas
  app.use("/api/encuestas", mdi, (req, res) => {
    let json = {}
    let qry = `
      SELECT TOP 100 * 
      FROM envios
      ORDER BY fecha DESC
    `
    sql.query(qry)
      .then(([results]) => {
        json.result = (results.length > 0) ? 200 : 500
        json.msg = (results.length > 0) ? "Ok" : "Sin registros"
        json.records = results.length
        json.data = results
      })
      .catch(err => {
        json.result = 403
        json.data = []
        json.records = 0
        json.msg = `Error ${err}`
      })
      .finally(() => {
        res.json(json)
      })

  }) // /api/encuestas

  app.use("/api/responses", (req, res) => {
    let json = fs.readFileSync('./src-ssr/middlewares/responses.json')
    res.end(json)


  }) //api/responses

})

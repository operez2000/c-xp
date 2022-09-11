export default class Util {

  NumberFormat = (valor, decimales = 2) => {
    return valor.toLocaleString('en-US', {minimumFractionDigits: decimales, maximumFractionDigits: decimales})
  }


  DivideZero = (val1, val2) => {
    return (val1 != 0 && val2 != 0) ? val1 / val2 : 0
  }


  addDays = (date, days) => {
    //let date = new Date(this.valueOf())
    date.setDate(date.getDate() + days)
    return date
  }
  
}
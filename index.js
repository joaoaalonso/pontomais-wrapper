const axios = require('axios')
const moment = require('moment')

const credentials = require('./credentials.json')

const url = 'https://api.pontomais.com.br/api/employees/timeline/863530'

const getData = async () => {
    const { data } = await axios.get(url, { headers: credentials })
    const dates = data.timeline.map(timeline => moment(timeline.datetime))
    
    return dates
}

const calculateMinutes = (dates) => {
    const sortedDates = dates.sort((a, b) => a.valueOf() - b.valueOf())
    
    if (sortedDates.length % 2) {
        sortedDates.push(moment())
    }

    let minutes = 0
    sortedDates.forEach((date, index) => {
        if (!index) return
        if (index % 2) {
            minutes += moment.duration(date.diff(sortedDates[index - 1])).asMinutes()
        }
    })

    return minutes
}

const handle = async () => {
    const dates = await getData()
    const minutes = calculateMinutes(dates)
    const hours = parseInt(minutes / 60)
    const rest = parseInt(minutes % 60)

    console.log(`${hours}h e ${rest}m`)
}

handle()
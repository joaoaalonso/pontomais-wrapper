const fs = require('fs')
const axios = require('axios')
const chalk = require('chalk')
const moment = require('moment')
const inquirer = require('inquirer')

const { app, Menu, Tray, remove } = require('electron')

const baseUrl = 'https://api.pontomais.com.br/api'

const JOURNEY = (8 * 60) + 48
const REFRESH_TIME = 60000

let tray = null
app.on('ready', () => {
    app.dock.hide()
    tray = new Tray('./blank.png')
    const contextMenu = Menu.buildFromTemplate([
        { 
            label: 'Atualizar',
            click: () => update(tray)
        },
        {  type: 'separator', },
        { 
            label: 'Fechar',
            click: () => app.exit(0)
        },
    ])
    tray.setContextMenu(contextMenu)

    update(tray)
    setInterval(() => {
        update(tray)
    }, REFRESH_TIME)
})

const getEmployeeId = async (credentials) => {
    const { data } = await axios.get(`${baseUrl}/session`, { headers: credentials })
    
    return data.session.employee.id
}

const getCredentials = async () => {
    const credentialsPath = './credentials.json'
    if (fs.existsSync(credentialsPath)) {
        const credentials = fs.readFileSync(credentialsPath)
        return JSON.parse(credentials)
    }
    
    const auth = await inquirer.prompt([
        {
            type: 'string',
            name: 'login',
            message: 'Login'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Senha'
        }
    ])

    const { data } = await axios.post(`${baseUrl}/auth/sign_in`, auth)

    const credentials = {
        uid: auth.login,
        client: data.client_id,
        'access-token': data.token,
        'token-type': 'Bearer'
    }

    credentials.employeeId = await getEmployeeId(credentials)

    fs.writeFileSync(credentialsPath, JSON.stringify(credentials))

    return credentials
}

const getData = async () => {
    const credentials = await getCredentials()

    const url = `${baseUrl}/employees/timeline/${credentials.employeeId}`
    const { data } = await axios.get(url, { headers: credentials })
    
    const dates = data.timeline
        .map(timeline => moment(timeline.datetime))
        .filter(date => date.isAfter(moment().startOf('Day')))
        
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

const update = async (tray) => {
    const dates = await getData()
    const even = !(dates.length % 2)
    const minutes = calculateMinutes(dates)

    const hours = parseInt(minutes / 60).toString().padStart(2, '0')
    const rest = parseInt(minutes % 60).toString().padStart(2, '0')
    const text = `${hours}:${rest}`

    let color = 'red'
    if (minutes >= JOURNEY) color = 'green'
    if (even) color = 'white'

    let missingMinutes = JOURNEY - minutes
    const missingText = missingMinutes > 0 ? 'Faltam' : 'Hora extra: '
    
    if (missingMinutes < 0) missingMinutes = missingMinutes * -1

    const missingHours = parseInt(missingMinutes / 60).toString().padStart(2, '0')
    const missingRest = parseInt(missingMinutes % 60).toString().padStart(2, '0')

    tray.setTitle(chalk[color](text))
    tray.setToolTip(`${missingText} ${missingHours}:${missingRest}`)
}
const status = document.getElementById('status')
const showPrev = document.getElementById('showPrev')
const showCpm = document.getElementById('showCpm')
const seriesAll = (data, realType, now, time) => [
  {
    type: 'spline',
    color: '#ff0000',
    name: 'TPS',
    data: data.tps.filter(arr => arr[0] >= now - time),
    yAxis: 1,
  },
  {
    type: 'spline',
    color: 'rgba(170, 32, 32, 0.4)',
    name: `TPS (previous ${realType})`,
    data: data.tps.filter(arr => arr[0] >= now - (time * 2) && arr[0] < now - time).map(arr => [arr[0] + time, arr[1]]),
  },
  {
    type: 'spline',
    color: '#00ff00',
    name: 'Players Online',
    data: data.players.filter(arr => arr[0] >= now - time),
  },
  {
    type: 'spline',
    color: 'rgba(32, 170, 32, 0.4)',
    name: `Players Online (previous ${realType})`,
    data: data.players.filter(arr => arr[0] >= now - (time * 2) && arr[0] < now - time).map(arr => [arr[0] + time, arr[1]]),
  },
  {
    type: 'spline',
    color: '#70d49e',
    name: 'Players in queue',
    data: data.playersInQueue.filter(arr => arr[0] >= now - time),
  },
  {
    type: 'spline',
    color: 'rgba(42, 142, 88, 0.4)',
    name: `Players in queue (previous ${realType})`,
    data: data.playersInQueue.filter(arr => arr[0] >= now - (time * 2) && arr[0] < now - time).map(arr => [arr[0] + time, arr[1]]),
  },
  {
    type: 'spline',
    color: '#a6f0ff',
    name: 'Total players',
    data: data.playersInQueue.filter(arr => arr[0] >= now - time).map((value, index) => [value[0], (data.players[index] || [0, 0])[1] + value[1]]),
  },
]
const cpmSeries = (data, realType, now, time) => [{
  type: 'spline',
  color: '#ffff00',
  name: 'Chats per minute',
  data: data.cpm.filter(arr => arr[0] >= now - time),
}]
const cpmPrevSeries = (data, realType, now, time) => [{
  type: 'spline',
  color: 'rgba(170, 170, 32, 0.4)',
  name: `Chats per minute (previous ${realType})`,
  data: data.cpm.filter(arr => arr[0] >= now - (time * 2) && arr[0] < now - time).map(arr => [arr[0] + time, arr[1]]),
}]
const seriesNoPrev = (data, realType, now, time) => [
  {
    type: 'spline',
    color: '#ff0000',
    name: 'TPS',
    data: data.tps.filter(arr => arr[0] >= now - time),
    yAxis: 1,
  },
  {
    type: 'spline',
    color: '#00ff00',
    name: 'Online players in server',
    data: data.players.filter(arr => arr[0] >= now - time),
  },
  {
    type: 'spline',
    color: '#70d49e',
    name: 'Players in queue',
    data: data.playersInQueue.filter(arr => arr[0] >= now - time),
  },
  {
    type: 'spline',
    color: '#a6f0ff',
    name: 'Total players',
    data: data.playersInQueue.filter(arr => arr[0] >= now - time).map((value, index, arr) => [value[0], value[1] + (data.players[data.players.length - (arr.length - index)] || [0, 0])[1]]),
  },
]
const update = async () => {
  status.textContent = 'updating data...'
  let max = 1440
  const typeArr = location.href.split('#')
  const type = typeArr.length < 2 ? '24h' : typeArr[1]
  let realType = null
  if (type === 'all' || type === '2d' || type === '48h') {
    max = 2880
    realType = '2d'
  } else if (type === '1d' || type === '24h') {
    max = 1440
    realType = '24h'
  } else if (type === '12h') {
    max = 720
    realType = '12h'
  } else if (type === '6h') {
    max = 360
    realType = '6h'
  } else if (type === '4h') {
    max = 240
    realType = '4h'
  } else if (type === '3h') {
    max = 180
    realType = '3h'
  } else if (type === '2h') {
    max = 120
    realType = '2h'
  } else if (type === '1h') {
    max = 60
    realType = '1h'
  } else {
    max = 1440
    realType = '24h'
  }
  const now = Date.now()
  const time = max * 60 * 1000
  const origin = location.origin
  const data = await fetch(`${origin}/api/data.json`).then(res => res.json())
  let selectedSeries = null
  if (showPrev.checked) { // show previous thing
    selectedSeries = seriesAll(data, realType, now, time)
    if (showCpm.checked) {
      selectedSeries = selectedSeries.concat(cpmSeries(data, realType, now, time), cpmPrevSeries(data, realType, now, time))
    }
  } else { // do not show previous thing
    selectedSeries = seriesNoPrev(data, realType, now, time)
    if (showCpm.checked) {
      selectedSeries = selectedSeries.concat(cpmSeries(data, realType, now, time))
    }
  }
  const last = (data.tps[data.tps.length - 1] || [0, 0])
  const seemsDown = last[0] < (Date.now() - 180000)
  if (seemsDown) {
    status.textContent = `the server seems down. (last received tps: ${last[1]} and ${last[1]} players online)`
  } else {
    status.textContent = `tps: ${last[1]}, players in queue: ${data.playersInQueue[data.playersInQueue.length - 1][1]} (showing last ${realType} entries)`
  }
  // eslint-disable-next-line no-undef
  Highcharts.chart('container', {
    chart: {
      zoomType: 'x',
      backgroundColor: '#0e0e0e',
    },
    title: {
      text: '',
    },
    subtitle: {
      text: '',
    },
    xAxis: {
      type: 'datetime',
    },
    yAxis: [{
      title: {
        text: 'Players',
      },
    }, {
      floor: 0,
      ceiling: 30,
      title: {
        text: 'Ticks Per Second',
      },
      opposite: true,
    }],
    legend: {
      enabled: false,
    },
    plotOptions: {
      spline: {
        marker: {
          radius: 0,
        },
        lineWidth: 2,
        states: {
          hover: {
            lineWidth: 3,
          },
        },
      },
    },

    series: selectedSeries.concat(),
    time: {useUTC: false},
  })
}
// used in index.html
// eslint-disable-next-line no-unused-vars
const updateDelayed = () => {
  setTimeout(() => update(), 10)
}

update()
setInterval(() => update(), 60000)

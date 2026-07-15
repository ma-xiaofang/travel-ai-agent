// 小程序中引入 echarts
const echarts = require('../uni_modules/lime-echart/static/echarts.min')
// APP 引入 echarts
// import * as echarts from 'echarts'

import { ref } from 'vue'

// echarts 图表 Hooks
export const useEcharts = (options): any => {
  // echarts 图实例
  const chartRef = ref(null)
  // echarts 图绘制函数
  const draw = () => {
    setTimeout(async () => {
      if (!chartRef.value) return
      const chart = await chartRef.value.init(echarts)
      chart.setOption(options.value)
    }, 300)
  }
  // 这里就封装巧妙之处，如果是对象，那么需要重命名，而是是数组，无需重命名
  return [chartRef, options, draw]
}

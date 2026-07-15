// 没必要为了 qs 一个简单的功能引入 qs，手写一个
export const qs = {
  stringify: function (obj) {
    return Object.keys(obj)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key]))
      .join('&')
  }
}

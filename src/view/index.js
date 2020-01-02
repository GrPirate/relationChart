import { typeMap } from './options'
let datas = {
  nodes: {
    id: 101,
    type: '自然人',
    name: '刘彦',
    relation: '拥有',
    brithday: '1983年12月11日',
    age: 34,
    sex: '男',
    address: '湖北省武汉市江岸区惠济路2号',
    children: [
      {
        id: 111,
        type: '手机号',
        name: '13986119831',
        relation: '拥有',
        direction: 'to',
        children: [
          {
            id: 1411,
            type: '网格',
            name: '武汉市江岸区惠济路网格',
            relation: '归属',
            direction: 'to'
          }
        ]
      },
      {
        id: 121,
        type: '手机号',
        name: '13802765427',
        relation: '拥有',
        direction: 'to',
        children: [
          {
            id: 1411,
            type: '网格',
            name: '武汉市江岸区惠济路网格',
            relation: '归属',
            direction: 'to'
          }
        ]
      },
      {
        id: 131,
        type: '宽带',
        name: 'CMNET2711987414',
        relation: '拥有',
        direction: 'to'
      },
      {
        id: 141,
        type: 'TV',
        name: 'TV28100321',
        relation: '拥有',
        direction: 'to'
      },
      {
        id: 151,
        type: '家庭',
        name: '湖北省武汉市江岸区惠济路2号',
        relation: '归属',
        direction: 'to',
        children: [
          {
            id: 1011,
            type: '自然人',
            name: '刘尚尚',
            relation: '归属',
            direction: 'from',
            children: [
              {
                id: 1113,
                type: '手机号',
                name: '13986119831',
                relation: '拥有',
                direction: 'to',
                children: [
                  {
                    id: 1411,
                    type: '网格',
                    name: '武汉市江岸区惠济路网格',
                    relation: '归属',
                    direction: 'to'
                  }
                ]
              },
              {
                id: 1213,
                type: '手机号',
                name: '13802765427',
                relation: '拥有',
                direction: 'to',
                children: [
                  {
                    id: 1411,
                    type: '网格',
                    name: '武汉市江岸区惠济路网格',
                    relation: '归属',
                    direction: 'to'
                  }
                ]
              }
            ]
          },
          {
            id: 1012,
            type: '自然人',
            name: '刘夏夏',
            relation: '归属',
            direction: 'from',
            children: [
              {
                id: 1112,
                type: '手机号',
                name: '13986119831',
                relation: '拥有',
                direction: 'to',
                children: [
                  {
                    id: 1411,
                    type: '网格',
                    name: '武汉市江岸区惠济路网格',
                    relation: '归属',
                    direction: 'to'
                  }
                ]
              },
              {
                id: 1212,
                type: '手机号',
                name: '13802765427',
                relation: '拥有',
                direction: 'to',
                children: [
                  {
                    id: 1411,
                    type: '网格',
                    name: '武汉市江岸区惠济路网格',
                    relation: '归属',
                    direction: 'to'
                  }
                ]
              }
            ]
          },
          {
            id: 1013,
            type: '自然人',
            name: '刘忠忠',
            relation: '归属',
            direction: 'from',
            children: [
              {
                id: 1111,
                type: '手机号',
                name: '13986119831',
                relation: '拥有',
                direction: 'to',
                children: [
                  {
                    id: 1411,
                    type: '网格',
                    name: '武汉市江岸区惠济路网格',
                    relation: '归属',
                    direction: 'to'
                  }
                ]
              },
              {
                id: 1211,
                type: '手机号',
                name: '13802765427',
                relation: '拥有',
                direction: 'to',
                children: [
                  {
                    id: 1411,
                    type: '网格',
                    name: '武汉市江岸区惠济路网格',
                    relation: '归属',
                    direction: 'to'
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}

const defaultConfig = {
  width: 1000, // 总画布svg的宽
  height: 800, // 高
  // nodes: {}, // 节点数组
  // links: [], // 线数组
  isHighLight: true, // 是否启动 鼠标 hover 到节点上高亮与节点有关的节点，其他无关节点透明的功能
  isScale: true, // 是否启用缩放平移zoom功能
  scaleExtent: [0.5, 3], // 缩放的比例尺
  chargeStrength: -300, // 万有引力
  collide: 100, // 碰撞力的大小 （节点之间的间距）
  nodeWidth: 100, // 每个node节点所占的宽度，正方形
  margin: 20, // node节点距离父亲div的margin
  alphaDecay: 0.0228, // 控制力学模拟衰减率
  r: 27.5, // 圆的半径 [30 - 45]
  relFontSize: 12, // 关系文字字体大小
  linkSrc: 10, // 划线时候的弧度
  linkColor: '#FFA2B0C4', // 链接线默认的颜色
  strokeColor: '#7ecef4', // 头像外围包裹的颜色
  strokeColorHover: 'rgba(146, 170, 215, 0.51)',
  strokeWidth: 1, // 头像外围包裹的宽度
  strokeWidthHover: 10,
  typeMap
}

var map = document.querySelector('#map')
window.RC = new RelationChart(map, datas, defaultConfig)
console.log(RC)

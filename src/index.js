import * as d3 from 'd3'

/**
 * 拓展对象
 * newconfig = extend({},defaultConfig,myconfig)
 */
function extend(target) {
  let sources = Array.prototype.slice.call(arguments, 1)

  for (let i = 0; i < sources.length; i += 1) {
    let source = sources[i]
    for (let key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key]
      }
    }
  }
  return target
}

// 求两点间的距离
function getDis(s, t) {
  return Math.sqrt((s.x - t.x) * (s.x - t.x) + (s.y - t.y) * (s.y - t.y))
}

// 求元素移动到目标位置所需要的 transform 属性值
function getTransform(source, target, _dis) {
  let r
  if (target.x > source.x) {
    if (target.y > source.y) {
      r = Math.asin((target.y - source.y) / _dis)
    } else {
      r = Math.asin((source.y - target.y) / _dis)
      r = -r
    }
  } else {
    if (target.y > source.y) {
      r = Math.asin((target.y - source.y) / _dis)
      r = Math.PI - r
    } else {
      r = Math.asin((source.y - target.y) / _dis)
      r -= Math.PI
    }
  }
  r = r * (180 / Math.PI)
  return 'translate(' + source.x + ',' + source.y + ')rotate(' + r + ')'
}

// 默认配置
const defaultConfig = {
  width: 1000, // 总画布svg的宽
  height: 800, // 高
  // nodes: {}, // 节点数组
  // links: [], // 线数组
  isHighLight: true, // 是否启动 鼠标 hover 到节点上高亮与节点有关的节点，其他无关节点透明的功能
  isScale: true, // 是否启用缩放平移zoom功能
  scaleExtent: [0.5, 3], // 缩放的比例尺
  chargeStrength: -300, // 万有引力
  collide: 70, // 碰撞力的大小 （节点之间的间距）
  nodeWidth: 100, // 每个node节点所占的宽度，正方形
  margin: 20, // node节点距离父亲div的margin
  alphaDecay: 0.0228, // 控制力学模拟衰减率
  r: 27.5, // 头像的半径 [30 - 45]
  relFontSize: 12, // 关系文字字体大小
  linkSrc: 30, // 划线时候的弧度
  linkColor: '#FFA2B0C4', // 链接线默认的颜色
  strokeColor: '#7ecef4', // 头像外围包裹的颜色
  strokeColorHover: 'rgba(146, 170, 215, 0.51)', 
  strokeWidth: 1, // 头像外围包裹的宽度
  strokeWidthHover: 5,
  callbackClick: function (d) {
    console.log('callbackClick: ', d, this)
  },
  callbackdbClick: function (d) {
    console.log('callbackdbClick: ', d)
  },
  typeMap: {}
}

function throttle (fun, delay) {
  let last, deferTimer
  return function (args) {
      let that = this
      let _args = arguments
      let now = +new Date()
      if (last && now < last + delay) {
          clearTimeout(deferTimer)
          deferTimer = setTimeout(function () {
              last = now
              fun.apply(that, _args)
          }, delay)
      }else {
          last = now
          fun.apply(that,_args)
      }
  }
}

function debounce(fun, delay) {
  return function (args) {
      let that = this
      let _args = args
      clearTimeout(fun.id)
      fun.id = setTimeout(function () {
          fun.call(that, _args)
      }, delay)
  }
}

export default class RelationChart {
  constructor(selector, data, configs = {}) {
    let mapW = parseInt(d3.select(selector).style('width'))
    let mapH = parseInt(d3.select(selector).style('height'))

    let defaultWH = {
      width: mapW,
      height: mapH
    }

    // 画布
    this.map = d3.select(selector)

    // 合并配置
    this.config = extend({}, defaultConfig, data, configs, defaultWH)
    console.log(this.config)
    this.nodeData = this.config.nodes

    this.typeMap = this.config.typeMap

    // bind callback
    if (Object.prototype.toString.call(this.config.callbackdbClick) !== '[object Function]') throw new TypeError('callbackdbClick is not a function')
    if (Object.prototype.toString.call(this.config.callbackClick) !== '[object Function]') throw new TypeError('callbackClick is not a function')

    // 需要高亮的node和link
    this.dependsNode = []
    this.dependsLinkAndText = []
    this.nodes = []
    if (!this.config.nodes) return false
    this.flatten()
    this.createLinks()

    // 创建力学模拟器
    this.initSimulation()
    this.emit = this.emit.bind(this)
    
    window.onresize = () => {
      throttle(() => {
        let svg = document.querySelector('.svgclass')
        svg.style.width = document.querySelector('.relation-main').clientWidth
      }, 1000)()
    } 
  }

  flatten() {
    let nodes = []
    function recurse(node) {
      if (node.children) {
        if (Object.prototype.toString.call(node.children) !== '[object Array]') node.children = [node.children]
        node.children.forEach(recurse)
      };
      nodes.push(node);
    }

    recurse(this.nodeData)
    
    console.log(nodes)
    this.nodes = nodes
  }

  createLinks() {
    let links = []

    // 节点根据id去重
    let nodeMap = new Map() // 节点索引
    this.nodes = this.nodes.filter(v => {
      if (nodeMap.has(v.id)) return false
      nodeMap.set(v.id, v)
      return true
    })

    function recurse(node) {
      if (node.children) {
        node.children.forEach(v => {
          let link = {
            source: v.direction === 'to' ? nodeMap.get(node.id) : nodeMap.get(v.id),
            target: v.direction === 'to' ? nodeMap.get(v.id) : nodeMap.get(node.id),
            relation: v.relation,
            color: 'A1B1C4'
          }
          links.push(link)
          recurse(v)
        })
      }
    }

    recurse(this.nodeData)
    console.log(links)
    this.dataLinks = links
  }
  // 创建力学模拟器
  initSimulation() {

    // 1. 创建一个力学模拟器
    this.simulation = d3
      .forceSimulation(this.nodes)
      // simulation.force(name,[force])函数，添加某种力
      .force('link', d3.forceLink(this.dataLinks))
      // 万有引力
      .force('charge', d3.forceManyBody().strength(this.config.chargeStrength))
      // d3.forceCenter()用指定的x坐标和y坐标创建一个新的居中力。
      .force(
        'center',
        d3.forceCenter(this.config.width / 2, this.config.height / 2)
      )
      // 碰撞作用力，为节点指定一个radius区域来防止节点重叠，设置碰撞力的强度，范围[0,1], 默认为0.7。设置迭代次数，默认为1，迭代次数越多最终的布局效果越好，但是计算复杂度更高
      .force(
        'collide',
        d3
          .forceCollide(this.config.collide)
          .strength(0.8)
          .iterations(15)
      )
      // 在计时器的每一帧中，仿真的alpha系数会不断削减,当alpha到达一个系数时，仿真将会停止，也就是alpha的目标系数alphaTarget，该值区间为[0,1]. 默认为0，
      // 控制力学模拟衰减率，[0-1] ,设为0则不停止 ， 默认0.0228，直到0.001
      .alphaDecay(this.config.alphaDecay)
      // 监听事件 ，tick|end ，例如监听 tick 滴答事件
      .on('tick', () => this.ticked())

      // 2.创建svg标签
    this.SVG = this.map
      .append('svg')
      .attr('class', 'svgclass')
      .attr('width', this.config.width)
      .attr('height', this.config.height)
      // .transition().duration(750).call(d3.zoom().transform, d3.zoomIdentity);
      .call(
        d3
          .zoom()
          .scaleExtent(this.config.scaleExtent)
          .on('zoom', () => {
            if (this.config.isScale) {
              this.relMap_g.attr('transform', d3.event.transform)
            }
          })
      )
      .on('click', () => console.log('画布 click'))
      .on('dblclick.zoom', null)

    // 3.defs  <defs>标签的内容不会显示，只有调用的时候才显示
    this.defs = this.SVG.append('defs')

    // 3.1 添加箭头
    this.marker = this.defs
      .append('marker')
      .attr('id', 'marker')
      .attr('markerWidth', 10) //marker视窗的宽
      .attr('markerHeight', 10) //marker视窗的高
      .attr('refX', this.config.r + 7 * this.config.strokeWidth) //refX和refY，指的是图形元素和marker连接的位置坐标
      .attr('refY', 4)
      .attr('orient', 'auto') //orient="auto"设置箭头的方向为自动适应线条的方向
      .attr('markerUnits', 'userSpaceOnUse') //marker是否进行缩放 ,默认值是strokeWidth,会缩放
      .append('path')
      .attr('d', 'M 0 0 8 4 0 8Z') //箭头的路径 从 （0,0） 到 （8,4） 到（0,8）
      .attr('fill', '#A1B1C4')

    // 3.2 添加多个头像图片的 <pattern>
    this.patterns = this.defs
      .selectAll('pattern.patternclass')
      .data(this.nodes)
      .enter()
      .append('pattern')
      .attr('class', 'patternclass')
      .attr('id', function(d, index) {
        return 'avatar' + d.id
      })
      // 两个取值userSpaceOnUse  objectBoundingBox
      .attr('patternUnits', 'objectBoundingBox')
      // <pattern>，x、y值的改变决定图案的位置，宽度、高度默认为pattern图案占填充图形的百分比。
      .attr('x', '0')
      .attr('y', '0')
      .attr('width', '1')
      .attr('height', '1')

    this.patterns
      .append('rect')
      .attr('id', d => d.id)
      .attr('width', this.config.r * 4)
      .attr('height', this.config.r * 4)
      .style('cursor', 'pointer')
      .style('fill', d => {
        return this.typeMap[d.type]['fill'] || '#5691FF'
      })
      .transition()
      .duration(2000)
      .ease(d3.easeElasticOut)
      .tween('circleIn', d => {
        let i = d3.interpolateNumber(0, this.config.r)
        return t => {
          d.r = i(t)
          this.simulation.force('collide', d3.forceCollide(this.config.collide))
        }
      })

    this.patterns.append('clipPath')
      .attr('id', d => `clip-${d.id}`)
      .append('use')
      .attr('xlink:href', d => `#${d.id}`);
    // 3.3 向<defs> - <pattern>添加 头像
		// display image as circle icon
    this.patterns.filter(d => !this.typeMap[d.type]['icon'])
      .append('text')
      .attr('class', 'nodetext')
      .attr('x', this.config.r)
      .attr('y', this.config.r + this.config.r / 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#fff')
      .style('font-size', this.config.r / 2)
      .text(function(d) {
        return d.userName || d.name
      })
    this.patterns.filter(d => !!this.typeMap[d.type]['icon'])
      .append('image')
      .classed('node-icon', true)
      .attr('clip-path', d => `url(#clip-${d.id})`)
      .attr('xlink:href', d => this.typeMap[d.type]['icon'])
      .attr('x', this.config.r * 0.5)
      .attr('y', this.config.r * 0.5)
      .attr('height', this.config.r * 2 * 0.5)
      .attr('width', this.config.r * 2 * 0.5)
    this.patterns.append('title')
        .text(d => d.userName || d.name);

    // 4.放关系图的容器
    this.relMap_g = this.SVG.append('g')
    .attr('class', 'relMap_g')
    .attr('width', this.config.width)
    .attr('height', this.config.height)
    
    this.link = this.relMap_g.selectAll('g.edge')
    this.node = this.relMap_g.selectAll('.circleclass')


    this.update()
  }

  update() {
    let that = this

    this.simulation
      .nodes(this.nodes)
      .force('link')
      .links(this.dataLinks)
      this.relMap_g.selectAll('g.edge').remove()
      this.relMap_g.selectAll('.circleclass').remove()
    this.link = this.link.data(this.dataLinks, d => d.target.id)

    this.link.exit().remove()

    // 5.关系图添加线
    // 5.1  每条线是个容器，有线 和一个装文字的容器
    // this.edges = this.relMap_g
    //   .selectAll('g.edge')
    //   .data(this.dataLinks)
    this.edges = this.link.enter()
      .insert('g', '.circleclass')
      .attr('class', 'edge')
      .on('mouseover', function() {
        d3.select(this)
          .selectAll('path.links')
          .attr('stroke-width', 4)
      })
      .on('mouseout', function() {
        d3.select(this)
          .selectAll('path.links')
          .attr('stroke-width', 1)
      })
      .on('click', function(d) {
        console.log('线click')
      })
      .attr('fill', function(d) {
        let str = '#bad4ed'
        if (d.color) {
          str = '#' + d.color
        }
        return str
      })

    // 5.2 添加线
    this.links = this.edges
      .append('path')
      .attr('class', 'links')
      .attr('d', d => {
        return (
          'M' +
          this.config.linkSrc +
          ',' +
          0 +
          ' L' +
          getDis(d.source, d.target) +
          ',0'
        )
      })
      .style('marker-end', 'url(#marker)')
      // .attr("refX",this.config.r)
      .attr('stroke', d => {
        let str = d.color ? '#' + d.color : this.config.linkColor
        return str
      })

    // 5.3 添加关系文字的容器
    this.rect_g = this.edges.append('g').attr('class', 'rect_g')

    // 5.4 添加rect
    this.rects = this.rect_g
      .append('rect')
      .attr('x', 40)
      .attr('y', -10)
      .attr('width', 30)
      .attr('height', 20)
      .attr('fill', 'white')
      .attr('strokeWidth', 0)

    // 5.5 文本标签  坐标（x,y）代表 文本的左下角的点
    this.texts = this.rect_g
      .append('text')
      .attr('x', 40)
      .attr('y', 5)
      .attr('text-anchor', 'middle') // <text>文本中轴对齐方式居中  start | middle | end
      .style('font-size', 12)
      .text(d => {
        return d.relation
      })
    this.node = this.node.data(this.nodes, d => d.id)

    this.node.exit().remove()

    // 6.关系图添加用于显示头像的节点
    // this.circles = this.relMap_g
    //   .selectAll('circle.circleclass')
    //   .data(this.nodes)
    console.log('enter: ', this.node.enter())
    this.circles = this.node.enter()
      .append('circle')
      .attr('class', 'circleclass')
      .attr('id', d => d.id)
      .style('cursor', 'pointer')
      .attr("cx", function (d) {
          return d.x;
      })
      .attr("cy", function (d) {
          return d.y;
      })
      .attr('fill', function(d) {
        return 'url(#avatar' + d.id + ')'
      })
      .attr('stroke', d => this.typeMap[d.type]['border'] || '#436FC0')
      .attr('stroke-width', this.config.strokeWidth)
      .attr('r', this.config.r)
      .on('mouseover', function(d) {
        d3.select(this).attr('stroke-width', that.config.strokeWidthHover)
        d3.select(this).attr('stroke', that.config.strokeColorHover)
        if (that.config.isHighLight) {
          that.highlightObject(d)
        }
      })
      .on('mouseout', function(d) {
        d3.select(this).attr('stroke-width', that.config.strokeWidth)
        d3.select(this).attr('stroke', d => that.typeMap[d.type]['border'] || '#436FC0')
        if (that.config.isHighLight) {
          that.highlightObject(null)
        }
      })
      .on('click', (d) => {
        clearTimeout(this.timer)
        this.timer = setTimeout(() => {
          console.log('单击节点事件')
          this.config.callbackClick(d)
        }, 300)
      })
      .on('dblclick', this.dbclick.bind(this))
      .on('contextmenu', function() {
        //鼠标右键菜单
        event = event || window.event
        event.cancelBubble = true
        event.returnValue = false
      })
      // 应用 自定义的 拖拽事件
      .call(
        d3
          .drag()
          .on('start', d => {
            d3.event.sourceEvent.stopPropagation()
            // restart()方法重新启动模拟器的内部计时器并返回模拟器。
            // 与simulation.alphaTarget或simulation.alpha一起使用时，此方法可用于在交互
            // 过程中进行“重新加热”模拟，例如在拖动节点时，在simulation.stop暂停之后恢复模拟。
            // 当前alpha值为0，需设置alphaTarget让节点动起来
            if (!d3.event.active) this.simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', d => {
            // d.fx属性- 节点的固定x位置
            // 在每次tick结束时，d.x被重置为d.fx ，并将节点 d.vx设置为零
            // 要取消节点，请将节点 .fx和节点 .fy设置为空，或删除这些属性。
            d.fx = d3.event.x
            d.fy = d3.event.y
          })
          .on('end', d => {
            // 让alpha目标值值恢复为默认值0,停止力模型
            if (!d3.event.active) this.simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

      console.log(this)

  }

  dbclick(d) {
    clearTimeout(this.timer)
    this.config.callbackdbClick(d)
    if (!d.children && !d._children) {
      return false
    }
    if (!d3.event.defaultPrevented) {
      if (d.children) {
        d._children = d.children;
        d.children = null;
      } else {
        d.children = d._children;
        d._children = null;
      }
    }

    this.emit()
    this.update();
    console.log('节点dbclick')
    // 展示方式2 ：浮窗展示
    // event = d3.event || window.event
    // var pageX = event.pageX
    //   ? event.pageX
    //   : event.clientX +
    //     (document.body.scrollLeft || document.documentElement.scrollLeft)
    // var pageY = event.pageY
    //   ? event.pageY
    //   : event.clientY +
    //     (document.body.scrollTop || document.documentElement.scrollTop)
    // // console.log('pagex', pageX);
    // // console.log('pageY', pageY);
    // //阻止事件冒泡  阻止事件默认行为
    // event.stopPropagation
    //   ? event.stopPropagation()
    //   : (event.cancelBubble = true)
    // event.preventDefault
    //   ? event.preventDefault()
    //   : (event.returnValue = false)
  }

  emit() {
    this.flatten()
    this.createLinks()
  }

  ticked() {
    // 7.1 修改每条容器edge的位置
    this.edges.attr('transform', function(d) {
      return getTransform(d.source, d.target, getDis(d.source, d.target))
    })

    // 7.2 修改每条线link位置
    this.links.attr('d', d => {
      return (
        'M' +
        this.config.linkSrc +
        ',' +
        0 +
        ' L' +
        getDis(d.source, d.target) +
        ',0'
      )
    })

    // 7.3 修改线中关系文字text的位置 及 文字的反正
    this.texts
      .attr('x', function(d) {
        // 7.3.1 根据字的长度来更新兄弟元素 rect 的宽度
        let bbox = d3
          .select(this)
          .node()
          .getBBox()
        let width = bbox.width
        // ########################
        // $(this).prev('rect').attr('width', width + 10);
        // d3.select(this).prev('rect').attr('width', width + 10);
        // 7.3.2 更新 text 的位置
        return getDis(d.source, d.target) / 2
      })
      .attr('transform', function(d) {
        // 7.3.3 更新文本反正
        if (d.target.x < d.source.x) {
          let x = getDis(d.source, d.target) / 2
          return 'rotate(180 ' + x + ' ' + 0 + ')'
        } else {
          return 'rotate(0)'
        }
      })

    // 7.4 修改线中装文本矩形rect的位置
    this.rects.attr('x', function(d) {
      // ######################
      // return getDis(d.source, d.target) / 2 - $(this).attr('width') / 2
      return getDis(d.source, d.target) / 2 - d3.select(this).attr('width') / 2
    }) // x 坐标为两点中心距离减去自身长度一半

    // 5.修改节点的位置
    this.circles
      .attr('cx', function(d) {
        return d.x
      })
      .attr('cy', function(d) {
        return d.y
      })
  }

  // 高亮元素及其相关的元素
  highlightObject(obj) {
    if (obj) {
      let objIndex = obj.index
      this.dependsNode = this.dependsNode.concat([objIndex])
      this.dependsLinkAndText = this.dependsLinkAndText.concat([objIndex])
      this.dataLinks.forEach(lkItem => {
        if (objIndex == lkItem['source']['index']) {
          this.dependsNode = this.dependsNode.concat([lkItem.target.index])
        } else if (objIndex == lkItem['target']['index']) {
          this.dependsNode = this.dependsNode.concat([lkItem.source.index])
        }
      })

      // 隐藏节点
      this.SVG.selectAll('circle')
        .filter(d => {
          return this.dependsNode.indexOf(d.index) == -1
        })
        .transition()
        .style('opacity', 0.1)
      // 隐藏线
      this.SVG.selectAll('.edge')
        .filter(d => {
          // return true;
          return (
            this.dependsLinkAndText.indexOf(d.source.index) == -1 &&
            this.dependsLinkAndText.indexOf(d.target.index) == -1
          )
        })
        .transition()
        .style('opacity', 0.1)
    } else {
      // 取消高亮
      // 恢复隐藏的线
      this.SVG.selectAll('circle')
        .filter(() => {
          return true
        })
        .transition()
        .style('opacity', 1)
      // 恢复隐藏的线
      this.SVG.selectAll('.edge')
        .filter(d => {
          // return true;
          return (
            this.dependsLinkAndText.indexOf(d.source.index) == -1 &&
            this.dependsLinkAndText.indexOf(d.target.index) == -1
          )
        })
        .transition()
        .style('opacity', 1)
      this.dependsNode = []
      this.dependsLinkAndText = []
    }
  }
}

// console.log(RelationChart)

;(function(global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? (module.exports = factory)
    : ((global = global || self), (global.RelationChart = factory))
})(this, RelationChart)

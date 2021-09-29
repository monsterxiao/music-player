// require 是 electron 自带的函数
// fs 是一个操作文件的库
const fs = require('fs')
const path = require('path')
const { clear } = require('console')
const { parse } = require('path')

const log = console.log.bind(console)

const e = (selector) => document.querySelector(selector)

const es = (selector) => document.querySelectorAll(selector)

const appendHtml = (element, html) => element.insertAdjacentHTML('beforeend', html)

// split 函数按照特定的分隔字符串来拆开歌曲文件名称
const split = (s, delimiter = ' ') => {
    let r = []
    let space = delimiter.length
    let start = 0
    for (let i = 0; i < s.length; i++) {
        let s1 = s.slice(i, i + space)
        if (s1 === delimiter) {
            let s2 = s.slice(start, i)
            r.push(s2)
            start = i + space
        }
    }
    let last = s.slice(start)
    r.push(last)
    return r
}

// 把 fs.readdir 封装成 promise 的形式, 方便使用
const readdir = (path) => {
    let p = new Promise((resolve, reject) => {
        fs.readdir(path, (error, files) => {
            if (error !== null) {
                reject(error)
            } else {
                resolve(files)
            }
        })
    })
    return p
}

const templateAudio = (audio, index) => {
    let title = split(audio, ' - ')[0]
    let s = split(audio, ' - ')[1]
    let end = s.length - 4
    let artist = s.slice(0, end)
    let id = index + 1

    let t = `
    <li class="song" id="song-${id}" data-href="${audio}" data-title="${title}" data-artist="${artist}">
        <div class="info">
            <div class="thumb-cover">
                <img src="static/img/${title}.jpg" alt="Album Cover">
            </div>
            <div class="titles">
                <a href="#" data-href="${audio}">${id} . ${title}</a>
                <p>${artist}</p>
            </div>
        </div>
        <div class="status" data-like="false">
            <i class="fa fa-heart-o"></i>
            <i class="fa fa-play"></i>
        </div>
    </li>
    `
    return t
}

const insertAudio = (audio, index) => {
    let container = e('#playlist')
    let html = templateAudio(audio, index)
    appendHtml(container, html)
}

const insertAudios = (audios) => {
    for (let i = 0; i < audios.length; i++) {
        let a = audios[i]
        insertAudio(a, i)
    }
}

// 加载本地 mp3 歌曲
const loadAudio = () => {
    let dir = 'audios'
    let pathname = path.join(__dirname, dir)
    readdir(pathname).then((files) => {
        // files 是 audios 目录下的文件
        // 从这些文件中筛选以 .mp3 结尾的文件
        let audios = files.filter((e) => e.endsWith('.mp3'))
        insertAudios(audios)
    })
}

// 点击歌曲文件后，通过这个函数处理
const handleClickTitle = (player, event) => {
    let self = event.target
    let song = self.closest('.song')
    let href = self.dataset.href
    let id = song.id
    actionPlay(player, song, href, id)
}

// 点击歌曲文件的播放图标后，通过这个函数处理
const handleClickPlay = (player, event) => {
    let song = event.target.closest('.song')
    let href = song.dataset.href
    let id = song.id
    actionPlay(player, song, href, id)
}

// 获取歌曲文件信息，播放歌曲并更新相关页面信息
const actionPlay = (player, song, href, id) => {
    // 用 path.join 拼接好 mp3 文件的路径
    let src = path.join(__dirname, 'audios', href)
    log('音乐文件的路径', src)
    // 播放并更新播放器相关元素
    player.src = src
    player.play()
    updateId(id)
    updateLikeForPlayer(song)
    updateSignal(song)
    updateCover(href)
    updateIsPlaying()
    rotateToggle('running')
}

// 处理上一首操作
const actionBack = (player) => {
    let p = e('.player')

    // 初始状态下点上一首按钮，自动播放第一首歌
    if (p.dataset.id === '') {
        let song = e('.song')
        let href = song.dataset.href
        let id = song.id
        actionPlay(player, song, href, id)
        return
    }

    // 非初始状态下，执行播放上一首
    // 歌曲的原始 id 格式为 'song-1'，要切片获取尾数
    let id = p.dataset.id.slice(-1)
    let offset = -1
    let mode = p.dataset.mode

    if (mode === "random") {
        actionRandom(player)
    } else {
        if (id === '') {
            log('上一首歌曲为空')
        } else {
            log('正在播放上一首')
            let song = nextSong(id, offset)
            let nextId = song.id
            let href = song.dataset.href
            actionPlay(player, song, href, nextId)
        }
    }
}

// 处理下一首操作
const actionNext = (player) => {
    let p = e('.player')
    // 初始状态下点上一首按钮，自动播放第一首歌
    if (p.dataset.id === '') {
        let song = e('.song')
        let href = song.dataset.href
        let id = song.id
        actionPlay(player, song, href, id)
        return
    }

    // 非初始状态下，执行播放上一首
    // 歌曲的原始 id 格式为 'song-1'，要切片获取尾数
    let id = p.dataset.id.slice(-1) 
    let offset = 1
    let mode = p.dataset.mode

    if (mode === "random") {
        actionRandom(player)
    } else {
        if (id === '') {
            log('下一首歌曲为空')
        } else {
            log('正在播放下一首')
            let song = nextSong(id, offset)
            let nextId = song.id
            let href = song.dataset.href
            actionPlay(player, song, href, nextId)
        }
    }
}

// 随机播放（播放结束后调用）
const actionRandom = (player) => {
    log('正在随机播放下一首')
    let id = e('.player').dataset.id.slice(-1) * 1
    let new_id = compareId(id)
    let offset = 0
    let song = nextSong(new_id, offset)
    let nextId = song.id
    let href = song.dataset.href
    actionPlay(player, song, href, nextId)
}

// 比较当前歌曲 id 与新生成的随机 id，避免重复播放同一首歌
const compareId = (id) => {
    let len = e('#playlist').children.length
    let new_id = randomId(len)
    if (new_id === id) {
        return compareId(id)
    } else {
        return new_id
    }
}

// 生成随机 id
const randomId = (len) => {
    // 得到随机（0, 1]
    let n = Math.random()
    // 得到随机（0, len + 1]
    n = n * (len + 1)
    n = Math.floor(n)
    return n
}

// 确定接下来要播放的歌
const nextSong = (id, offset) => {
    let p = e('#playlist')
    let len = p.children.length
    let lastId = parseInt(id)
    nextId = (lastId + offset) % len
    // 特殊情况，第一首的上一首歌, nextId = 0
    // 实际上是跳转到最后一首歌, nextId = len
    if (nextId === 0) {
        nextId = len
    }
    let idSelector = '#song-' + String(nextId)
    let song = e(idSelector)
    return song
}

// 处理播放结束
const actionEnded = (player, mode, container) => {
    log("播放结束, 当前播放模式是", mode)
    // 停止封面转动
    rotateToggle('paused')

    let isplaying = container.dataset.isplaying
    if (isplaying === 'true') {
        if (mode === 'loopOne') {
            player.play()
            rotateToggle('running')
        } else if(mode === 'loopAll') {
            actionNext(player)
        } else if(mode === 'random') {
            actionRandom(player)
        } 
    }
}

// 更新当前歌曲 id
const updateId = (id) => {
    let p = e('.player')
    p.dataset.id = id
}

// 更新当前歌曲封面等
const updateCover = (href) => {
    let title = split(href, ' - ')[0]
    let s = split(href, ' - ')[1]
    let end = s.length - 4
    let artist = s.slice(0, end)
    // 更新背景
    let bg = e('.bg')
    let style = `
    url('static/img/${title}-bg.jpg') no-repeat center center/cover
    ` 
    bg.style.background = style
    // 更新封面
    let cover = e('.cover')
    let src = `static/img/${title}.jpg`
    cover.querySelector('img').src = src
    // 更新歌曲信息
    let text = e('.text')
    text.children[0].innerHTML = title
    text.children[1].innerHTML = artist
}

// 更新正在播放的图标
const updateSignal = (song) => {
    // remove fa-signal
    let element = e('.fa-signal')
    if (element !== null) {
        element.classList.remove('fa-signal')
        element.classList.add('fa-play')
    }
    // add fa-signal
    let play = song.querySelector('.fa-play')
    play.classList.remove('fa-play')
    play.classList.add('fa-signal')
}

// 更新播放或暂停图标
const updateIsPlaying = () => {
    e('.player').dataset.isplaying = true
    let icon = e('.fa-play-circle')
    if (icon !== null) {
        icon.classList.remove('fa-play-circle')
        icon.classList.add('fa-pause-circle')
    }
}

// 更新歌曲的 heart 标签
const updateLikeForPlayer = (song) => {
    let like = song.querySelector('.status').dataset.like
    let icon = e('.top-icons').children[0]
    if (like === 'true') {
        icon.classList.remove('fa-heart-o')
        icon.classList.add('fa-heart')
    } else {
        icon.classList.remove('fa-heart')
        icon.classList.add('fa-heart-o')
    }
}

// 播放清单 heart 开关，联动更新
const likeToggleForBar = (event) => {
    let self = event.target
    let like = self.closest('.status').dataset.like
    let song = self.closest('.song')
    let title = song.dataset.title

    if (like === 'true') {
        self.classList.remove('fa-heart')
        self.classList.add('fa-heart-o')
        self.closest('.status').dataset.like = false
    } else {
        self.classList.remove('fa-heart-o')
        self.classList.add('fa-heart')
        self.closest('.status').dataset.like = true
    }
    if (title === e('.text h1').innerText) {
        updateLikeForPlayer(song)
    }
}

// 播放器 heart 开关，联动更新
const likeToggleForPlayer = (event) => {
    if (noSong()) {
        return
    }
    let self = event.target
    let song = e('.fa-signal').closest('.song')
    let icon = song.querySelector('.status').children[0]
    let like = song.dataset.like
    if (like === 'true') {
        self.classList.remove('fa-heart')
        self.classList.add('fa-heart-o')
        icon.classList.remove('fa-heart')
        icon.classList.add('fa-heart-o')
        song.dataset.like = false
    } else {
        self.classList.remove('fa-heart-o')
        self.classList.add('fa-heart')
        icon.classList.remove('fa-heart-o')
        icon.classList.add('fa-heart')
        song.dataset.like = true
    }
}

// 封面转动开关
const rotateToggle = (action) => {
    e('.cover img').style.webkitAnimationPlayState = action
}

// 分享歌曲的弹窗
const shareAlert = () => {
    if (noSong()) {
        return
    }
    let title = e('.text').children[0].innerHTML
    let artist = e('.text').children[1].innerHTML
    let s = `我正在听 ${artist} 主唱的《${title}》

< 分享歌曲信息，邀请朋友一起来听吧 ! >`
    alert(s)
}

// 歌曲为空的弹窗
const noSong = () => {
    let songId = e('.player').dataset.id
        if (songId === '') {
            let s = `
            目前播放歌曲为空，请选择你要播放的歌曲
            `
            alert(s)
            return true
        } else {
            return false
        }
}

// 曲目循环模式开关
const retweetToggle = (event, container) => {
    let self = event.target
    let isActive = self.dataset.active
    clearRandom()

    if (isActive === "true") {
        container.dataset.mode = 'loopOne'
        container.querySelector('.text h3').innerHTML = '播放模式：单曲循环'
        self.style.opacity = ''
        self.style.color = ''
        self.dataset.active = false
    } else {
        container.dataset.mode = 'loopAll'
        container.querySelector('.text h3').innerHTML = '播放模式：曲目循环'
        self.style.opacity = '1'
        self.style.color = 'rgb(0, 255, 149)'
        self.dataset.active = true
    }
}

// 随机播放模式开关
const randomToggle = (event, container) => {
    let self = event.target
    let isActive = self.dataset.active
    clearRetweet()

    if (isActive === 'true') {
        container.dataset.mode = 'loopOne'
        container.querySelector('.text h3').innerHTML = '播放模式：单曲循环'
        self.style.opacity = ''
        self.style.color = ''
        self.dataset.active = false
    } else {
        container.dataset.mode = 'random'
        container.querySelector('.text h3').innerHTML = '播放模式：随机'
        self.style.opacity = '1'
        self.style.color = 'rgb(0, 255, 149)'
        self.dataset.active = true
    }
}

// 清除随机播放模式的相关数据
const clearRandom = () => {
    let random = e('.fa-random')
    let isActive = random.dataset.active
    if (isActive === 'true') {
        random.style.opacity = ''
        random.style.color = ''
        random.dataset.active = false
    }
}

// 清除曲目循环模式的相关数据
const clearRetweet = () => {
    let retweet = e('.fa-retweet')
    let isActive = retweet.dataset.active
    if (isActive === 'true') {
        retweet.style.opacity = ''
        retweet.style.color = ''
        retweet.dataset.active = false
    }
}

// 处理播放器的播放和暂停按钮
const handlePlayOrPause = (player, event, container) => {
    let self = event.target
    let isPlaying = container.dataset.isplaying
    if (isPlaying === 'true') {
        player.pause()
        rotateToggle('paused')
        self.classList.remove('fa-pause-circle')
        self.classList.add('fa-play-circle')
        container.dataset.isplaying = false
    } else {
        // 初始状态下点播放按钮则播放第一首歌
        if (container.dataset.id === '') {
            let song = e('.song')
            let href = song.dataset.href
            let id = song.id
            actionPlay(player, song, href, id)
        } else {
            // 非初始状态下（暂停播放后的状态）点击播放，则播放之前暂停的歌曲
            player.play()
            rotateToggle('running')
            self.classList.remove('fa-play-circle')
            self.classList.add('fa-pause-circle')
            container.dataset.isplaying = true
        }
    }
}

// 播放器事件委托
const bindEventForPlayer = (player) => {
    let container = e('.player')
    container.addEventListener('click', (event) => {
        let self = event.target
        if (self.classList.contains('fa-heart-o') || self.classList.contains('fa-heart')) {
            likeToggleForPlayer(event)
        }
        if (self.classList.contains('fa-share')) {
            shareAlert()
        }
        if (self.classList.contains('fa-play-circle') || self.classList.contains('fa-pause-circle')) {
            handlePlayOrPause(player, event, container)
        }
        if (self.classList.contains('fa-retweet')) {
            retweetToggle(event, container)
        }
        if (self.classList.contains('fa-random')) {
            randomToggle(event, container)
        }
        if (self.classList.contains('fa-backward')) {
            actionBack(player)
        }
        if (self.classList.contains('fa-forward')) {
            actionNext(player)
        }
    })
}

// 歌曲清单栏事件委托
const bindEventForBar = (player) => {
    let container = e('#playlist')
    container.addEventListener('click', (event) => {
        let self = event.target
        if (self.tagName.toLowerCase() === 'a') {
            // 取消 a 标签的默认行为
            event.preventDefault()
            handleClickTitle(player, event)
        }
        if (self.classList.contains('fa-play')) {
            handleClickPlay(player, event)
        }
        if (self.classList.contains('fa-heart-o') || self.classList.contains('fa-heart')) {
            likeToggleForBar(event)
        }
    })
}

// 绑定歌曲 ended 事件
const bindEventEnded = (player) => {
    let p = e('.player')
    player.addEventListener('ended', (event) => {
        let mode = p.dataset.mode
        actionEnded(player, mode, p)
    })
}

// 绑定 timeupdate 事件，通过更新 currentTime 来更新时间显示和进度条显示
const bindEventTimeUpdate =(player) => {
    let time = e('.time')
    let crtm = time.children[0]
    let dutn = time.children[1]

    player.addEventListener('timeupdate', () => {
        let position = player.currentTime / player.duration
        let progress = position * 100 + '%'
        // 这里用 jQuery 的 .css() 方法动态修改css
        $('.fillbar').css('width', progress)
        convertCurrentTime(Math.round(player.currentTime), crtm)
        convertTotalTime(Math.round(player.duration), dutn)
    })
}

// 转化当前歌曲 currentTime 的时间格式
const convertCurrentTime = (seconds, crtm) => {
    // 转时间单位
    let min = Math.floor(seconds / 60)
    let sec = seconds % 60
    // 转时间格式
    min = (min < 10) ? '0' + min : min
    sec = (sec < 10) ? '0' + sec : sec
    // 把时间更新到页面
    crtm.innerHTML = min + ':' + sec
}

// 转化当前歌曲 duration 的时间格式
const convertTotalTime = (seconds, dutn) => {
    // 转时间单位
    let min = Math.floor(seconds / 60)
    let sec = seconds % 60
    // 转时间格式
    min = (min < 10) ? '0' + min : min
    sec = (sec < 10) ? '0' + sec : sec
    // 把时间更新到页面
    dutn.innerHTML = min + ':' + sec
}

// 进度条拖拽相关事件绑定
const bindEventsSeek = (player) => {
    let fillbar = e('.fillbar')
    let seek = e('.seek')
    let handle = e('.handle')
    
    // 进度条最大值为 seek 元素的宽度
    let max = seek.offsetWidth
    // 定义移动开关
    let moving = false
    // 初始偏移量
    let offset = 0
    // mousedown 点击 handle 时，获取播放器到窗口的距离 offset
    handle.addEventListener('mousedown', (event) => {
        if (noSong()) {
            return
        }
        player.pause()
        // log('event', event.clientX, handle.offsetLeft, event.clientX - handle.offsetLeft)
        offset = event.clientX - handle.offsetLeft
        moving = true
    })
    // mouseup 事件，拖拽完成，改变 moving 开关的值
    document.addEventListener('mouseup', (event) => {
        moving = false
    })
    // mousemove 事件，动态获取 handle 在相对进度条的位置 x
    document.addEventListener('mousemove', (event) => {
        if (moving) {
            // handle 移动的距离
            let x = event.clientX - offset
            // handle 距离有一个范围, 即 0 < x < max
            if (x > max) {
                x = max 
            }
            if (x < 0) {
                x = 0
            }
            // 位置数据转化百分比并更新到页面
            let width = (x / max) * 100
            fillbar.style.width = String(width) + '%'
            player.currentTime = player.duration * x / max
            checkIsPlaying(player)
        }
    })
    // 通过随机点击进度条改变当前歌曲进度
    seek.addEventListener('click', (event) => {
        log('clicked')
        if (noSong()) {
            return
        }
        // 如果点击到 handle ，则直接返回
        // 避免与 mousedown 事件中点击 handle 拖拽进度条发生矛盾
        let self = event.target
        if (self.classList.contains('handle')) {
            checkIsPlaying(player)
            return
        }
        // 获取进度条被点击的位置的坐标值 offsetX
        let x = event.offsetX
        let width = (x / max) * 100
        fillbar.style.width = String(width) + '%'
        player.currentTime = player.duration * x / max
        checkIsPlaying(player)
    })
}

// 判断当前播放器播放状态来控制是否要播放
const checkIsPlaying = (player) => {
    let isplaying = e('.player').dataset.isplaying
    if (isplaying === 'true') {
        player.play()
    } else {
        player.pause()
    }
}

// 绑定搜索栏 keyup 事件获取用户输入值
const bindEventSearch =() => {
    let search = e('#search')
    search.addEventListener('keyup', (event) => {
        let self = event.target
        let input = self.value
        searchSong(input) 
    })
}

// 实现歌曲搜索功能
const searchSong = (input) => {
    let songs = es('.song')
    hideElements(songs)
    for (let song of songs) {
        log(song)
        let t = song.dataset.title.toLowerCase()
        let a = song.dataset.artist.toLowerCase()
        let v = input.toLowerCase()
        if (t.includes(v) || a.includes(v)) {
            song.style.display = ''
        }
    }
}

const hideElements = (elements) => {
    for (let e of elements) {
        e.style.display = 'none'
    }
}

// 加载播放器，绑定所有事件
const bindEvents = () => {
    let player = new Audio()
    rotateToggle('paused')

    bindEventForPlayer(player)
    bindEventForBar(player)
    bindEventTimeUpdate(player)
    bindEventsSeek(player)
    bindEventEnded(player)
    bindEventSearch()
}

// 函数入口
const __main = () => {
    bindEvents()
    loadAudio()
}

__main()

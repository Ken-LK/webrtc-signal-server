const Koa = require('koa')
const Router = require('koa-router')
const websockify = require('koa-websocket')

const app = websockify(new Koa())
const router = new Router()

app.ws.use((ctx, next) => {
    return next(ctx)
})

router.get('/', async ctx => {
    ctx.body = '欢迎'
})

let wsPool = {};

router.all('/websocket', async ctx => {

    ctx.websocket.on('message', msg => {
        console.info('接收到消息：', msg )
        try {
            msg = JSON.parse(msg);
        } catch (e) {
            console.log('JSON转换数据异常：', e.message)
            return
        }

        // 没有用户信息直接返回
        if (!msg.sender) {
            return
        }

        if (msg.type === 'join') { //初始化时候将ws实例挂载到wsPool下
            wsPool[msg.sender] = ctx.websocket;
            const replyInfo = {}

            replyInfo.type = 'online'
            replyInfo.enterUser = msg.sender
            replyInfo.onlineUserTotalNum = Object.keys(wsPool).length

            let onlineUserArray = []

            // 在线人列表
            for (let onlineUser in wsPool) {
                onlineUserArray.push(onlineUser)
            }
            replyInfo.onlineUserList = onlineUserArray

            // 上线广播通知
            for (let onlineUser in wsPool) {
                wsPool[onlineUser].send(JSON.stringify(replyInfo))
            }


        }

        else if (msg.type === 'ping') {
            wsPool[msg.sender].send(JSON.stringify('pong'));
        }

        else if (msg.type === 'chat') {

            // 聊天内容广播通知
            for (let onlineUser in wsPool) {
                wsPool[onlineUser].send(JSON.stringify(msg))
            }
        }


        else {
            // 发送给接收者
            if (Reflect.has(wsPool, msg.sender)) {
                wsPool[msg.receiver].send(JSON.stringify(msg));
                console.log( msg.sender,'发送给:', msg.receiver, '  类型为：', msg.type)
            }
        }
        // ctx.websocket.send(msg)
    })
    ctx.websocket.on('close', msg => {
        console.log('前端关闭了websocket:', msg)
    })
})

app
    .ws
    .use(router.routes())
    .use(router.allowedMethods())

app.listen(3000, () => {
    console.log('koa websocket is listening in 3000')
})

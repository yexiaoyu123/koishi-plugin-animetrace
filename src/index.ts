import { Context, Logger, Schema,h } from 'koishi'
import Jimp from 'jimp'
export const name = 'animetrace'
export interface Config {}
  
export const Config: Schema<Config> = Schema.object({})
export function apply(ctx: Context) {
    var logger = ctx.logger("识图搜索");
    ctx.command("Gal识图", "AI识别Galgame来源出处").option("/Gal识图", "AI识别Galgame来源出处").action(async (Argv) => {
        let model = 'game';
        if (Argv.args[0] === '2') {
            model = 'game_model_kirakira';
        }
        const temp = getguildData(Argv.session.guild);
        if (temp.checkStatus(Argv.session.userId)) {
            await Argv.session.send("请等待上一个搜图指令结束");
            return;
        }
        temp.userStatusPlay(Argv.session.userId);
        const img = h.select(Argv.session.elements, "img");
        let imageUrl = img[0]?.attrs?.src;
        if (!imageUrl) {
            await Argv.session.send("发张图片给我看看！");
            const picImg = await Argv.session.prompt(30000);
            if (picImg) {
                const [img2] = h.select(picImg, "img");
                imageUrl = img2?.attrs.src;
            } else {
                temp.userCloseOlay(Argv.session.userId);
                return;
            }
        }
        await Argv.session.send("少女祈祷中...");
        let res = null;
        try {
            const buffer = await fetchImage(imageUrl); // 下载图片
            logger.info('正在获取图片...');
            if (buffer == false) {
                logger.error('图片下载失败：', imageUrl);
                await Argv.session.send("图片娘走丢了QAQ~\n要...要不再发送一次试试？");
                temp.userCloseOlay(Argv.session.userId);
                return; // 停止后续代码的执行
            }
            const blob = await buffer.blob();
            const formData = new FormData();
            formData.append('image', blob, 'image.jpg');
            // 发送 POST 请求
            logger.info('发送识别请求中...');
            const res = await fetchPost(`https://aiapiv2.animedb.cn/ai/api/detect?force_one=1&model=${model}&ai_detect=0`, {
                method: 'POST',
                body: formData
            });
            if (res == false) {
                logger.error('请求搜图服务器失败了~');
                await Argv.session.send("服务器娘请求失败了QAQ~\n要...要不再发送一次试试？");
                temp.userCloseOlay(Argv.session.userId);
                return; // 停止后续代码的执行
            } 
            const data = await res.json(); //获取json
            logger.info('请求成功：', data);
            let format = await generateFormat(data, buffer);
            if (Argv.args[0] != '2') {
                format = format + `\n\n没有你想要的结果？\n试试[Gal识图 2]吧~`;
            }
            await Argv.session.send(format);
            temp.userCloseOlay(Argv.session.userId);
        } catch (error) {
            logger.info('发生未知错误：', error);
            await Argv.session.send("发生未知错误");
            temp.userCloseOlay(Argv.session.userId);
        }
    });
    ctx.command("动漫识图", "AI识别图片适用于同人，原画...").option("/动漫识图", "AI识别图片适用于同人，原画...").action(async (Argv) => {
        let model = 'anime_model_lovelive';
        if (Argv.args[0] === '2') {
            model = 'pre_stable';
        }
        const temp = getguildData(Argv.session.guild);
        if (temp.checkStatus(Argv.session.userId)) {
            await Argv.session.send("请等待上一个搜图指令结束");
            return;
        }
        temp.userStatusPlay(Argv.session.userId);
        const img = h.select(Argv.session.elements, "img");
        let imageUrl = img[0]?.attrs?.src;
        if (!imageUrl) {
            await Argv.session.send("发张图片给我看看！");
            const picImg = await Argv.session.prompt(30000);
            if (picImg) {
                const [img2] = h.select(picImg, "img");
                imageUrl = img2?.attrs.src;
            } else {
                temp.userCloseOlay(Argv.session.userId);
                return;
            }
        }
        await Argv.session.send("少女祈祷中...");
        let res = null;
        try {
            const buffer = await fetchImage(imageUrl); // 下载图片
            logger.info('正在获取图片...');
            if (buffer == false) {
                logger.error('图片下载失败：', imageUrl);
                await Argv.session.send("图片娘走丢了QAQ~\n要...要不再发送一次试试？");
                temp.userCloseOlay(Argv.session.userId);
                return; // 停止后续代码的执行
            }
            const blob = await buffer.blob();
            const formData = new FormData();
            formData.append('image', blob, 'image.jpg');
            // 发送 POST 请求
            logger.info('发送识别请求中...');
            const res = await fetchPost(`https://aiapiv2.animedb.cn/ai/api/detect?force_one=1&model=${model}&ai_detect=0`, {
                method: 'POST',
                body: formData
            });
            if (res == false) {
                logger.error('请求搜图服务器失败了~');
                await Argv.session.send("服务器娘请求失败了QAQ~\n要...要不再发送一次试试？");
                temp.userCloseOlay(Argv.session.userId);
                return; // 停止后续代码的执行
            }
            const data = await res.json(); //获取json
            logger.info('请求成功：', data);
            let format = await generateFormat(data, buffer);
            if (Argv.args[0] != '2') {
                format = format + `\n\n没有你想要的结果？\n试试[动漫识图 2]吧~`;
            }
            await Argv.session.send(format);
            temp.userCloseOlay(Argv.session.userId);
        } catch (error) {
            logger.info('发生未知错误：', error);
            await Argv.session.send("发生未知错误");
            temp.userCloseOlay(Argv.session.userId);
        }
    });
}
async function cropImage(buffer, box) {
    try {
        // 读取图片
        const image = await Jimp.read(buffer);
        const width = image.getWidth();
        const height = image.getHeight();

        // 克隆原始图片
        const newImage = image.clone();

        // 计算裁剪区域
        const x = width * box[0];
        const y = height * box[1];
        const w = width * (box[2] - box[0]);
        const h = height * (box[3] - box[1]);

        // 裁剪图片
        newImage.crop(x, y, w, h);

        // 获取裁剪后的图片的 Base64 编码
        const base64 = await newImage.getBase64Async(Jimp.AUTO);
        return base64;
    } catch (error) {
        throw error;
    }
}
async function generateFormat(data, buffer) {
    // 并行处理所有的 cropImage 调用
    const dataLength = data.data.length;
    const croppedImages = await Promise.all(data.data.map(async (item) => {
        const cropimg = await cropImage(buffer, item.box);
        return {item,cropimg};
    }));
    const format = `共识别到${dataLength}个人物\n` +
        croppedImages.map((obj, index) => {
            const {item,cropimg} = obj;
            return (index > 0 ? `-----------------------------------\n` : "") +
                `<img src="${cropimg}"/>` +
                item.char.map((i) => {
                    return `《${i.cartoonname}》的角色 ${i.name}`;
                }).join("\n");
        }).join("\n");
    return format;
}
var guildData = {};
function getguildData(guild) {
    const info = String(guild.guildId);
    if (!guildData[info])
        guildData[info] = {
            // 用户信息
            playstatus: {},
            // 获取当前状态
            checkStatus(userId) {
                return !!this.playstatus[userId];
            },
            // 用户开启
            userStatusPlay(userId) {
                if (!this.playstatus[userId])
                    this.playstatus[userId] = true;
                this.playstatus[userId] = true;
            },
            // 用户关闭
            userCloseOlay(userId) {
                this.playstatus[userId] = false;
            }
        };
    return guildData[info];
}
// 获取图片 
async function fetchImage(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            return false;
        }
        return response
    } catch (error) {
        return false;
    }
}
// 发送post请求
async function fetchPost(url, abc) {
    try {
        const response = await fetch(url, abc);
        if (!response.ok) {
            return false;
        }
        return response;
    } catch (error) {
        return false;
    }
}
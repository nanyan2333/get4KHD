# before use  
蒻笱自己写的一个小工具，agent.py可以改随机等待时间，spider.py里是爬虫的主要函数，爬其他网站要修改xpath筛标签，私用自动下载好康的。  
第一次用先运行双击setup.bat,然后再在url.txt里一行一行加入要爬取的链接，保存后运行app.bat就可以电脑自己下图图了  
虽然也没人看见就是了  

## 保存路径
在scheduler.py中修改，main函数中有path变量
## 代理端口
在spider.py中修改proxy
## 为什么不写个配置yaml
因为懒，反正自用
## 关于使用
url.txt里有一份使用实例url，将代理端口和保存路径改好之后直接运行app.bat就可以自动下图了

import traceback

import spider
import requests as axios
import agent
from lxml import html
import os

with open("url.txt",'r') as urlfile:
    urls = urlfile.readlines()

for url in urls:
    try:
        htmls = axios.get(url, headers=agent.get_agent(), proxies=spider.proxies)
        tree = html.fromstring(htmls.text)  # tree是html组件树

        page_link = tree.xpath('//a[@class="page-numbers"]')  # 正则筛选标签,页码链接
        page_link_list = [link_obj.attrib.get('href') for link_obj in page_link]
        page_link_list.insert(0, url)  # 选出剩下页数的链接

        filepath = tree.xpath('//title/text()')

        path = './assets/' + filepath[0] + '/'
        if not os.path.exists(path):
            os.makedirs(path)  # 生成保存路径

        spider.get_all_img(page_link_list,path)

    except Exception as err:
        with open('log.txt','w') as logfile:
            logfile.write(f"Error processing {url}: {str(err)}\n")
            traceback.print_exc(file=logfile)
        with open('unCatchUrl.txt','w') as ucf:
            ucf.write(url+'\n')





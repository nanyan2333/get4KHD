import time
import os
import requests as axios
from lxml import html
from requests.adapters import HTTPAdapter

import agent

url = "https://ccork.xxtt.info/2024/03/06/tao-liang-a-zhai-bad-jk.html"
img_ext = '.png'
proxies = {
    'http': '127.0.0.1:7890',
    'https': '127.0.0.1:7890'
}
img_count = 1
headers = agent.get_agent()

sess = axios.Session()
sess.mount('http://', HTTPAdapter(max_retries=3))
sess.mount('https://', HTTPAdapter(max_retries=3))
sess.keep_alive = False  # 关闭多余连接

def get_each_page_img(img_link_list:[str],file_path:str):
    global img_count
    for img_url in img_link_list:
        tmp_str = str(img_url).split('/')[-1].split('.')
        filename = f"{tmp_str[0]}.{tmp_str[1].split('-')[0]}-{img_count:03d}{img_ext}"
        try:
            img_data = axios.get(str(img_url), proxies=proxies, stream=True, headers=agent.get_agent()).content
            with open(file_path + filename, 'wb') as file:
                file.write(img_data)
        except (axios.exceptions.ProxyError, axios.exceptions.SSLError) as err:
            print(f"代理连接异常：{err}")
            break  # 代理异常时正常退出循环
        else:
            print(filename + "已下载")
            time.sleep(agent.get_random_sleep())
            img_count += 1  # 每成功下载一张图片，img_count递增


htmls = axios.get(url, headers=headers, proxies=proxies)

tree = html.fromstring(htmls.text)

page_link = tree.xpath('//a[@class="page-numbers"]')
page_link_list = [link_obj.attrib.get('href') for link_obj in page_link]

links = tree.xpath('//a[img]/@href')
links.pop()

path = './assets/'+'-'.join(str(links[0]).split('/')[-1].split('.')[0].split('-')[:-1])+'/'
if not os.path.exists(path):
    os.makedirs(path)

get_each_page_img(links,path)

for page in page_link_list:
    links = tree.xpath('//a[img]/@href')
    links.pop()
    get_each_page_img(links,path)
    time.sleep(agent.get_random_sleep())





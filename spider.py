import time

import requests as axios
from lxml import html
from requests.adapters import HTTPAdapter
from tqdm import tqdm

import agent
import util

img_ext = '.png'  # 保存格式
proxies = {
    'http': '127.0.0.1:7890',
    'https': '127.0.0.1:7890'
}  # 代理ip和端口
img_count = 1  # 图片计数器
headers = agent.get_agent()  # 固定请求头

sess = axios.Session()  # 配置会话的最大重试次数
sess.mount('http://', HTTPAdapter(max_retries=3))
sess.mount('https://', HTTPAdapter(max_retries=3))
sess.keep_alive = False  # 关闭多余连接


def download_img(filename: str, img_url: str, filepath: str, chunk_size=1024 * 1024):
    img_data = axios.get(str(img_url), proxies=proxies, stream=True, headers=agent.get_agent())
    if img_data.status_code == 200:
        progress_bar = tqdm(initial=0, unit='B', unit_scale=True, desc=filename)
        with open(filepath + filename, 'ab') as file:
            for chunk in img_data.iter_content(chunk_size=chunk_size):
                if chunk:
                    file.write(chunk)
                    progress_bar.update(len(chunk))
        progress_bar.close()
    else:
        util.output_err(f'status_code{img_data.status_code} download err {filename}')
        util.record_err_download_img_url(img_url, filepath, filename)


def download_each_page_img(img_link_list: list[str], file_path: str):
    global img_count
    for img_url in img_link_list:
        tmp_str = str(img_url).split('/')[-1].split('.')
        filename = f"{tmp_str[0]}-{tmp_str[1].split('-')[0]}-{img_count:03d}{img_ext}"
        try:
            download_img(filename, str(img_url), file_path)
        except (axios.exceptions.ProxyError, axios.exceptions.SSLError) as err:
            util.record_err_download_img_url(img_url, file_path, filename)
            util.output_err(str(err))
        finally:
            time.sleep(agent.get_random_sleep())
            img_count += 1  # 每成功下载一张图片，img_count递增


def get_all_img(page_link_list: list[str], path: str):
    for page in page_link_list:
        htmls = axios.get(page, headers=headers, proxies=proxies)  # 循环get剩下页面的图片
        tree = html.fromstring(htmls.text)
        links = tree.xpath('//a[img]/@href')
        links.pop()
        download_each_page_img(links, path)
        time.sleep(agent.get_random_sleep())
    for _ in range(3):
        re_download_img()


def re_download_img() -> None:
    print('开始重下载')
    with open('./unCatchImg.txt', 'r+') as file:
        img_info = file.readlines()
        for info in img_info:
            url, filepath, filename = info.split('#')
            try:
                download_img(filename, url, filepath)
            except (axios.exceptions.ProxyError, axios.exceptions.SSLError) as err:
                util.record_err_download_img_url(url, filepath, filename)
                util.output_err(str(err))
        print("重下载检查完毕")

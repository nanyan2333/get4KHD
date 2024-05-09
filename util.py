def record_err_download_img_url(url, filepath, filename) -> None:
    with open('./unCatchImg.txt', 'a') as ucf:
        ucf.write(f'{url}#{filepath}#{filename}\n')


def output_err(string):
    print(f'\033[1;31m{string}\033[0m')

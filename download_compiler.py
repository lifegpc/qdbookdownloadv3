from os.path import exists
from os import remove
from requests import Session, RequestException
from traceback import print_exc
import sys


def get_github_tags(author='google', repo='closure-compiler'):
    ses = Session()
    ses.headers['Accept'] = 'Accept: application/vnd.github.v3+json'
    re = ses.get(f'https://api.github.com/repos/{author}/{repo}/tags')  # noqa: E501
    if re.status_code >= 400:
        raise ValueError(f'HTTP Error {re.status_code} {re.reason}')
    return re.json()


def get_download_urls(tags):
    urls = []
    for t in tags:
        tag = t['name']
        if tag.startswith('webpack-'):
            continue
        url = f'https://repo1.maven.org/maven2/com/google/javascript/closure-compiler/{tag}/closure-compiler-{tag}.jar'  # noqa: E501
        urls.append(url)
    return urls


def download_compiler(urls):
    ses = Session()
    for url in urls:
        if exists('compiler.jar'):
            remove('compiler.jar')
        print(url)
        re = ses.get(url, stream=True)
        if re.status_code >= 400:
            print(f'HTTP Error {re.status_code} {re.reason}')
            continue
        with open('compiler.jar', 'wb') as f:
            try:
                for b in re.iter_content(chunk_size=1024):
                    if b:
                        f.write(b)
            except RequestException:
                continue
        print(f'{url} -> compiler.jar')
        break


if __name__ == '__main__':
    try:
        tags: list = get_github_tags()
        urls = get_download_urls(tags)
        download_compiler(urls)
    except Exception:
        print_exc()
        sys.exit(1)

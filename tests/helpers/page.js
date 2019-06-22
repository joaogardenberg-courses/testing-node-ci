const puppeteer = require('puppeteer');

const userFactory = require('../factories/userFactory');
const sessionFactory = require('../factories/sessionFactory');

class CustomPage {
  static async build() {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    const page = await browser.newPage();
    const customPage = new CustomPage(page);

    return new Proxy(customPage, {
      get: (target, property) => {
        if (property === 'close') {
          return browser[property] || page[property] || customPage[property];
        }

        return customPage[property] || page[property] || browser[property]
      }
    });
  }

  constructor(page) {
    this.page = page;
  }

  async login() {
    const user = await userFactory();
    const { session, sig } = sessionFactory(user);

    await this.page.setCookie({ name: 'session',     value: session });
    await this.page.setCookie({ name: 'session.sig', value: sig });
    await this.page.goto('http://localhost:3000/blogs');
    await this.page.waitFor('a[href="/auth/logout"]');
  }

  get(path) {
    return this.page.evaluate((_path) => {
      return fetch(_path, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        }
      }).then((res) => res.json());
    }, path);
  }

  post(path, data) {
    return this.page.evaluate((_path, _data) => {
      return fetch(_path, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(_data)
      }).then((res) => res.json());
    }, path, data);
  }

  execRequests(actions) {
    return Promise.all(
      actions.map(({ method, path, data }) => {
        return this[method](path, data);
      })
    );
  }

  async getContentsOf(selector) {
    await this.page.waitFor(selector);
    return this.page.$eval(selector, (el) => el.innerHTML);
  }

  async click(selector) {
    await this.page.waitFor(selector);
    return this.page.click(selector);
  }

  async type(selector, text) {
    await this.page.waitFor(selector);
    return this.page.type(selector, text);
  }
}

module.exports = CustomPage;
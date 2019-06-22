const Page = require('./helpers/page');

let page;

Number.prototype._called = {};

beforeEach(async () => {
  page = await Page.build();
  await page.goto('http://localhost:3000');
});

afterEach(async () => {
  await page.close();
});

describe('when logged in', () => {
  beforeEach(async () => {
    await page.login();
  });

  describe('and redirected to blog creation page', () => {
    beforeEach(async () => {
      await page.click('a[href="/blogs/new"]');
    });

    test('can see blog create form', async () => {
      const label = await page.getContentsOf('form label');

      expect(label).toEqual('Blog Title');
    });

    describe('and using valid inputs', () => {
      beforeEach(async () => {
        await page.type('.title input', 'My title');
        await page.type('.content input', 'My content');
        await page.click('form button');
      });

      test('submitting takes user to review screen', async () => {
        const text = await page.getContentsOf('h5');

        expect(text).toEqual('Please confirm your entries');
      });

      test('submitting then saving adds blog to index page', async () => {
        await page.click('button.green');

        const title = await page.getContentsOf('.card-title');
        const content = await page.getContentsOf('.card p');

        expect(title).toEqual('My title');
        expect(content).toEqual('My content');
      });
    });

    describe('and using invalid inputs', () => {
      beforeEach(async () => {
        await page.click('form button');
      });

      test('the form shows an error message', async () => {
        const titleError = await page.getContentsOf('.title .red-text');
        const contentError = await page.getContentsOf('.content .red-text');

        expect(titleError).toEqual('You must provide a value');
        expect(contentError).toEqual('You must provide a value');
      });
    });
  });
});

describe('when not logged in', () => {
  const actions = [{
    method: 'get',
    path: '/api/blogs'
  }, {
    method: 'post',
    path: '/api/blogs',
    data: {
      title: 'T',
      content: 'C'
    }
  }];

  test('blog related actions are prohibited', async () => {
    const results = await page.execRequests(actions);

    for (let result of results) {
      expect(result).toEqual({ error: 'You must log in!' });
    }
  });
});
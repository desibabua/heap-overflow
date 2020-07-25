const request = require('supertest');
const sinon = require('sinon');
const fetch = require('node-fetch');
const { app } = require('../src/routes');
const Sessions = require('../src/sessions');

describe('GET', () => {
  context('/', () => {
    it('Should be redirected to home path (/home) for path "/"', done => {
      request(app)
        .get('/')
        .set('Accept', '*/*')
        .expect(302)
        .expect('Location', '/home', done);
    });

    it('Should get home page for path "/home"', done => {
      request(app)
        .get('/home')
        .set('Accept', '*/*')
        .expect(200)
        .expect('Content-Type', /text\/html/)
        .expect(/heapOverflow | Home/, done);
    });

    it('should get public file for  the home page', done => {
      request(app)
        .get('/css/header.css')
        .set('accept', '*/*')
        .expect(200)
        .expect('Content-Type', /text\/css/)
        .expect(/#icon {/, done);
    });
  });

  context('/askQuestion', () => {
    it('should serve askQuestion page when logged in', (done) => {
      const sessions = new Sessions();
      const id = sessions.addSession('1');
      app.locals.sessions = sessions;
      request(app)
        .get('/askQuestion')
        .set('accept', '*/*')
        .set('Cookie', `session=${id}`)
        .expect(200)
        .expect('Content-Type', /text\/html/)
        .expect(/heapOverflow | Ask/, done);
    });

    it('should serve unauthorized if not logged in', (done) => {
      request(app)
        .get('/askQuestion')
        .set('accept', '*/*')
        .expect(401, done);
    });
  });

  context('/question', () => {
    it('should serve question page for valid question id', (done) => {
      request(app)
        .get('/question?id=2')
        .set('accept', '*/*')
        .expect(200)
        .expect('Content-Type', /text\/html/)
        .expect(/heapOverflow | Question/, done);
    });

    it('should serve "wrong Id" when invalid id is given', (done) => {
      request(app)
        .get('/question?id=10')
        .set('accept', '*/*')
        .expect(400)
        .expect('Content-Type', /text\/html/)
        .expect('Wrong Id Provided', done);
    });
  });

  context('/questionDetails', () => {
    it('should serve question details for valid question id', (done) => {
      request(app)
        .get('/questionDetails?id=2')
        .set('accept', '*/*')
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(/"id":2/, done);
    });

    it('should serve "wrong Id" when invalid id is given', (done) => {
      request(app)
        .get('/questionDetails?id=10')
        .set('accept', '*/*')
        .expect(400)
        .expect('Content-Type', /text\/html/)
        .expect('Wrong Id Provided', done);
    });
  });

  context('/entry', () => {
    it('should be redirected to gitHub authentication', (done) => {
      request(app)
        .get('/entry?targetPath=home')
        .set('accept', '*/*')
        .expect(302)
        .expect('Location', /\?targetPath=home/)
        .expect('Location', /github.com\/login\/oauth\/authorize/, done);
    });
  });

  context('/verify', () => {
    it('should redirect to targetPath when right credentials given', (done) => {
      const stubbed = sinon.stub(fetch, 'Promise');
      stubbed.returns(Promise.resolve({ json: () => ({ 'access_token': 1, login: 'user1' }) }));
      request(app)
        .get('/verify?code=1&targetPath=home')
        .set('accept', '*/*')
        .expect(302)
        .expect('Location', '/home', () => {
          sinon.restore();
          done();
        });
    });

    it('should redirect to signUp page if user doesn\'t exist', (done) => {
      const stubbed = sinon.stub(fetch, 'Promise');
      stubbed.returns(Promise.resolve({
        json: () =>
          ({ 'access_token': 1, login: 'user10', avatar_url: 'avatar' })
      }));
      request(app)
        .get('/verify?code=1&targetPath=home')
        .set('accept', '*/*')
        .expect(302)
        .expect('Location', '/signUp', () => {
          sinon.restore();
          done();
        });
    });

    it('should redirect to home page if auth error occurs', (done) => {
      request(app)
        .get('/verify?error=errorMsg')
        .set('accept', '*/*')
        .expect(302)
        .expect('Location', '/home', done);
    });
  });

  context('/signUp', () => {
    it('should serve signUp page when the person is new user', (done) => {
      const sessions = new Sessions();
      const id = sessions.addSession('2');
      app.locals.sessions = sessions;
      request(app)
        .get('/signUp')
        .set('accept', '*/*')
        .set('Cookie', `session=${id}`)
        .expect(200)
        .expect('Content-Type', /text\/html/)
        .expect(/heapOverflow | Sign Up/, done);
    });

    it('should give unauthorized when the user is not authorized', (done) => {
      request(app)
        .get('/signUp')
        .set('accept', '*/*')
        .expect(401, done);
    });
  });
});

describe('POST', function() {
  context('/saveDetails', () => {
    it('should save user details when he is authorized', (done) => {
      const sessions = new Sessions();
      const id = sessions.addSession('3');
      app.locals.sessions = sessions;
      request(app)
        .post('/saveDetails')
        .set('Cookie', `session=${id}`)
        .send('name=Narut&email=john%40email.com&location=Bangalore')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(302)
        .expect('Location', '/home', done);
    });

    it('should not save user details when he is not authorized', (done) => {
      request(app)
        .post('/saveDetails')
        .send('name=Narut&email=john%40email.com&location=Bangalore')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .expect(401, done);
    });
  });

  context('/saveQuestion', () => {
    it('should save given valid question', (done) => {
      const sessions = new Sessions();
      const id = sessions.addSession('1');
      app.locals.sessions = sessions;
      request(app)
        .post('/saveQuestion')
        .set('Cookie', `session=${id}`)
        .send({title: 'title', body: 'body', bodyText: 'bodyText'})
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect(/{"id":.*}/, done);
    });

    it('should serve unauthorized if not logged in', (done) => {
      request(app)
        .post('/saveQuestion')
        .send({title: 'title', body: 'body', bodyText: 'bodyText'})
        .set('Content-Type', 'application/json')
        .expect(401, done);
    });
  });
});

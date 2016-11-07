var
  should = require('should'),
  sinon = require('sinon'),
  sandbox = sinon.sandbox.create(),
  KuzzleMock = require('../../mocks/kuzzle.mock'),
  RequestObject = require('kuzzle-common-objects').Models.requestObject,
  ResponseObject = require('kuzzle-common-objects').Models.responseObject,
  ReadController = require('../../../lib/api/controllers/readController');

describe('Test: read controller', () => {
  var
    controller,
    kuzzle,
    requestObject;

  beforeEach(() => {
    kuzzle = new KuzzleMock();
    controller = new ReadController(kuzzle);
    requestObject = new RequestObject({index: '%test', collection: 'unit-test-readcontroller'});
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#search', () => {
    it('should fulfill with a response object', () => {
      return controller.search(requestObject)
        .then(response => should(response).be.instanceOf(ResponseObject));
    });

    it('should reject with a response object in case of error', () => {
      kuzzle.services.list.storageEngine.search.rejects(new Error('foobar'));
      return should(controller.search(requestObject))
        .be.rejectedWith('foobar');
    });

    it('should trigger a plugin event', function () {
      return controller.search(requestObject)
        .then(() => {
          should(kuzzle.pluginsManager.trigger)
            .be.calledTwice()
            .be.calledWith('data:beforeSearch')
            .be.calledWith('data:afterSearch');
        });
    });
  });

  describe('#get', () => {
    it('should fulfill with a response object', () => {
      return controller.get(requestObject)
        .then(response => should(response).be.instanceOf(ResponseObject));
    });

    it('should reject with a response object in case of error', () => {
      kuzzle.services.list.storageEngine.get.rejects(new Error('foobar'));
      return should(controller.get(requestObject)).be.rejected();
    });

    it('should trigger a plugin event', function () {
      return controller.get(requestObject)
        .then(() => {
          should(kuzzle.pluginsManager.trigger)
            .be.calledTwice()
            .be.calledWith('data:beforeGet')
            .be.calledWith('data:afterGet');
        });
    });
  });

  describe('#count', () => {
    it('should fulfill with a response object', () => {
      return controller.count(requestObject)
        .then(response => should(response).be.instanceOf(ResponseObject));
    });

    it('should reject with a response object in case of error', () => {
      kuzzle.services.list.storageEngine.count.rejects(new Error('foobar'));
      return should(controller.count(requestObject)).be.rejected();
    });

    it('should emit a data:count hook when counting', function () {
      return controller.count(requestObject)
        .then(() => {
          should(kuzzle.pluginsManager.trigger)
            .be.calledTwice()
            .be.calledWith('data:beforeCount')
            .be.calledWith('data:afterCount');
        });
    });
  });

  describe('#listCollections', () => {
    var
      context = {
        connection: {id: 'connectionid'},
        token: null
      };

    beforeEach(() => {
      kuzzle.services.list.storageEngine.listCollections.resolves({collections: {stored: ['foo']}});
      kuzzle.hotelClerk.getRealtimeCollections.returns([
        {name: 'foo', index: 'index'},
        {name: 'bar', index: 'index'},
        {name: 'baz', index: 'wrong'}
      ]);
    });

    it('should resolve to a full collections list', () => {
      requestObject = new RequestObject({index: 'index'}, {}, '');

      return controller.listCollections(requestObject, context)
        .then(result => {
          should(kuzzle.hotelClerk.getRealtimeCollections).be.calledOnce();
          should(kuzzle.services.list.storageEngine.listCollections).be.calledOnce();
          should(result.data.body.type).be.exactly('all');
          should(result.data.body.collections).not.be.undefined().and.be.an.Object();
          should(result.data.body.collections.stored).not.be.undefined().and.be.an.Array();
          should(result.data.body.collections.realtime).not.be.undefined().and.be.an.Array();
          should(result.data.body.collections.stored.sort()).match(['foo']);
          should(result.data.body.collections.realtime.sort()).match(['bar', 'foo']);
        });
    });

    it('should trigger a plugin event', function () {
      return controller.listCollections(requestObject)
        .then(() => {
          should(kuzzle.pluginsManager.trigger)
            .be.calledTwice()
            .be.calledWith('data:beforeListCollections')
            .be.calledWith('data:afterListCollections');
        });
    });

    it('should reject the request if an invalid "type" argument is provided', () => {
      requestObject = new RequestObject({body: {type: 'foo'}}, {}, '');

      return should(controller.listCollections(requestObject, context)).be.rejected();
    });

    it('should only return stored collections with type = stored', () => {
      requestObject = new RequestObject({body: {type: 'stored'}}, {}, '');

      return controller.listCollections(requestObject, context)
        .then(response => {
          should(response.data.body.type).be.exactly('stored');
          should(kuzzle.hotelClerk.getRealtimeCollections.called).be.false();
          should(kuzzle.services.list.storageEngine.listCollections.called).be.true();
        });
    });

    it('should only return realtime collections with type = realtime', () => {
      requestObject = new RequestObject({body: {type: 'realtime'}}, {}, '');

      return controller.listCollections(requestObject, context)
        .then(response => {
          should(response.data.body.type).be.exactly('realtime');
          should(kuzzle.hotelClerk.getRealtimeCollections.called).be.true();
          should(kuzzle.services.list.storageEngine.listCollections.called).be.false();
        });
    });

    it('should reject with a response object if getting stored collections fails', () => {
      kuzzle.services.list.storageEngine.listCollections.rejects(new Error('foobar'));
      requestObject = new RequestObject({body: {type: 'stored'}}, {}, '');
      return should(controller.listCollections(requestObject, context)).be.rejected();
    });

    it('should reject with a response object if getting all collections fails', () => {
      kuzzle.services.list.storageEngine.listCollections.rejects(new Error('foobar'));
      requestObject = new RequestObject({body: {type: 'all'}}, {}, '');
      return should(controller.listCollections(requestObject, context)).be.rejected();
    });

  });

  describe('#now', () => {
    it('should trigger a plugin event', function () {
      return controller.now(requestObject)
        .then(() => {
          should(kuzzle.pluginsManager.trigger)
            .be.calledTwice()
            .be.calledWith('data:beforeNow')
            .be.calledWith('data:afterNow');
        });
    });

    it('should resolve to a number', () => {
      return controller.now(requestObject)
        .then(result => {
          should(result.data).not.be.undefined();
          should(result.data.body.now).not.be.undefined().and.be.a.Number();
        });
    });
  });

  describe('#listIndexes', () => {
    it('should fulfill with a response object', () => {
      return controller.listIndexes(requestObject)
        .then(response => should(response).be.instanceOf(ResponseObject));
    });

    it('should reject with a response object in case of error', () => {
      kuzzle.services.list.storageEngine.listIndexes.rejects(new Error('foobar'));
      return should(controller.listIndexes(requestObject)).be.rejected();
    });

    it('should emit a data:listIndexes hook when reading indexes', function () {
      return controller.listIndexes(requestObject)
        .then(() => {
          should(kuzzle.pluginsManager.trigger)
            .be.calledTwice()
            .be.calledWith('data:beforeListIndexes')
            .be.calledWith('data:afterListIndexes');
        });
    });
  });

  describe('#serverInfo', () => {
    it('should return a properly formatted server information object', () => {
      return controller.serverInfo(requestObject)
        .then(res => {
          res = res.toJson();
          should(res.status).be.exactly(200);
          should(res.error).be.null();
          should(res.result).not.be.null();
          should(res.result.serverInfo).be.an.Object();
          should(res.result.serverInfo.kuzzle).be.and.Object();
          should(res.result.serverInfo.kuzzle.version).be.a.String();
          should(res.result.serverInfo.kuzzle.api).be.an.Object();
          should(res.result.serverInfo.kuzzle.api.version).be.a.String();
          should(res.result.serverInfo.kuzzle.api.routes).be.an.Object();
          should(res.result.serverInfo.kuzzle.plugins).be.an.Object();
          should(res.result.serverInfo.kuzzle.system).be.an.Object();
          should(res.result.serverInfo.services).be.an.Object();
        });
    });

    it('should reject with a response object in case of error', () => {
      kuzzle.services.list.broker.getInfos.rejects(new Error('foobar'));
      return should(controller.serverInfo(requestObject)).be.rejected();
    });
  });

  describe('#collectionExists', () => {
    it('should call the storageEngine', () => {
      kuzzle.services.list.storageEngine.collectionExists.resolves('result');
      return controller.collectionExists(requestObject)
        .then(response => {
          should(response).match({
            error: null,
            data: {
              body: 'result'
            }
          });

          should(kuzzle.pluginsManager.trigger)
            .be.calledTwice()
            .be.calledWith('data:beforeCollectionExists')
            .be.calledWith('data:afterCollectionExists');

          should(kuzzle.services.list.storageEngine.collectionExists)
            .be.calledOnce();
        });
    });
  });

  describe('#indexExists', () => {
    it('should call the storagEngine', () => {
      kuzzle.services.list.storageEngine.indexExists.resolves('result');
      return controller.indexExists(requestObject)
        .then(response => {
          should(response).match({
            error: null,
            data: {
              body: 'result'
            }
          });

          should(kuzzle.pluginsManager.trigger)
            .be.calledTwice()
            .be.calledWith('data:beforeIndexExists')
            .be.calledWith('data:afterIndexExists');

          should(kuzzle.services.list.storageEngine.indexExists)
            .be.calledOnce();
        });
    });

  });

});

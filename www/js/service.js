//global services go here
angular.module('omniwallet').factory('userService', ['$rootScope', '$http',
function($rootScope, $http) {
  var service = {
    data : {
      walletKey : '',
      asymKey : {},
      wallet : {},
      loggedIn : false
    },

    login : function(wallet, walletKey, asymKey) {
      service.data.walletKey = walletKey;
      service.data.asymKey = asymKey;
      service.data.wallet = wallet;
      service.data.loggedIn = true;
    },

    logout : function() {
      service.data.loggedIn = false;
      service.data.wallet = {}
    },

    addAddress : function(address, privKey) {
      for (var i in service.data.wallet.addresses ) {
        if (service.data.wallet.addresses[i].address == address) {
          service.data.wallet.addresses[i].privkey = privKey;
          service.saveSession();
          return;
        }
      };
      // update currencies
      $http.post('/v1/address/addr/', {
        'addr' : address
      }).success(function(result) {
        var currencies = [];
        result.balance.map(function(e, i, a) {
          currencies.push(e.symbol);
        });
        service.data.wallet.addresses.push({
          "address" : address,
          "privkey" : privKey,
          "currencies" : currencies
        });
        service.data.loggedIn = true;
        service.saveSession();
      }).error(function(error) {
        service.data.wallet.addresses.push({
          "address" : address,
          "privkey" : privKey,
          "currencies" : []
        });
      });
    },

    getAddress : function(address) {
      for (var i in service.data.wallet.addresses) {
        if (service.data.wallet.addresses[i].address == address) {
          return service.data.wallet.addresses[i];
        }
      }
    },

    getAllAddresses : function() {
      return service.data.wallet.addresses;
    },

    getCurrencies : function() {
      currencies = []
      for (var i in service.data.wallet.addresses) {
        for (var c = 0; c < service.data.wallet.addresses[i].currencies.length; c++) {
          if (currencies.indexOf(service.data.wallet.addresses[i].currencies[c]) == -1) {
            currencies.push(service.data.wallet.addresses[i].currencies[c]);
          }
        }
      }
      return currencies;
    },

    getWallet : function() {
      return service.data.wallet;
    },

    getUUID : function() {
      return service.data.wallet.uuid;
    },

    removeAddress : function(address) {
      for (var i = 0; i < service.data.wallet.addresses.length; i++)
        if (service.data.wallet.addresses[i].address == address) {
          service.data.wallet.addresses.splice(i, 1);
          service.saveSession();
          return;
        }
    },

    updateWallet : function() {
      var uuid = service.getUUID();
      return $http.get('/v1/user/wallet/challenge?uuid=' + uuid).then(function(result) {
        var data = result.data;
        var encryptedWallet = CryptUtil.encryptObject(service.data.wallet, service.data.walletKey);
        var challenge = data.challenge;
        var signature = ""

        return $http({
          url : '/v1/user/wallet/update',
          method : 'POST',
          data : {
            uuid : uuid,
            wallet : encryptedWallet,
            challenge : challenge,
            signature : signature
          }
        });
      });
    },

    saveSession : function() {
      service.updateWallet().then(function() {
        console.log("Success saving")
      });
    }
  };

  return service;
}]);

angular.module('omniwallet').factory('appraiser', ['$rootScope', '$http',
function($rootScope, $http) {

  function AppraiserService() {
    this.conversions = {};
    this.coins = ['BTC', 'MSC'];
    var self = this;
    function UpdateLoop() {
      self.updateValues(function() {
        setTimeout(UpdateLoop, 30000);
      });
    }

    UpdateLoop();
  };
  AppraiserService.prototype.updateValues = function(callback) {
    var self = this;
    $http.get('/v1/pricing/valuations.json').then(function(coinValuation) {
      coinValuation.forEach(function(currency) {
        if (currency.symbol == 'BTC') {
          // Store these things internally as the value of a satoshi.
          self.conversions.BTC = currency.price / 100000000;
          $rootScope.$emit('APPRAISER_VALUE_CHANGED', 'BTC');
        } else {
          if(self.coins.indexOf(currency.symbol) != -1){
            self.conversions[currency.symbol] = currency.price;
            $rootScope.$emit('APPRAISER_VALUE_CHANGED', currency.symbol);
          }
        }
      }); 
      callback();
    }, function(error) {
      console.log(error);
      callback();
    });
  };
  AppraiserService.prototype.addSmartPropertyToken = function(symbol) {
    var self = this;

    if (self.coins.indexOf(symbol) == -1)
      self.coins.push(symbol);
  };
  AppraiserService.prototype.getValue = function(amount, symbol) {
    if (symbol == 'BTC') {
      if (this.conversions.BTC)
        return this.conversions.BTC * amount;
      else
        return 'BTC Value Unavailable';
    } else {
      if (this.conversions.hasOwnProperty(symbol)) {
        return this.getValue(this.conversions[symbol] * amount, 'BTC');
      } else
        return symbol + ' Value Unavailable';
    }
  };

  return new AppraiserService();
}]);

angular.module('omniwallet').factory('hashExplorer', function() {
  var tx = '', loc = '';
  return {
    tx : tx,
    loc : loc
  }
});

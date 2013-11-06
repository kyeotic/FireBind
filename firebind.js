(function(ko) {
    var getItemById = function(items, idProperty, id) {
        var setItem;
        for (var i = 0; i < items.length; i++) {
            if (items[i][idProperty] === id) {
                setItem = items[i];
                break;
            };
        }
        return setItem;
    };

    var removeSetItem = function(fireSet, childId) {
        var item = fireSet.child(childId);
        if (item != null)
            item.remove();
    };

    ko.fireSet = function(fireSet, Constructor, config) {
        var set = ko.observableArray(),
            config = config || {},
            query = config.query,
            idProperty = config.id || 'id';
        
        if (query) {
            if (query.startAt)
                fireSet = fireSet.startAt(query.startAt);
            if (query.endAt)
                fireSet = fireSet.endAt(query.endAt);
            if (query.limit)
                fireSet = fireSet.limit(query.limit);
        };
        
        //Keep a reference to the original set methods
        var setPush = set.push,
            setRemove = set.remove;
        
        fireSet.on('child_added', function(item) {
            var id = item.name(),
                data = item.val();
            setPush.call(set, new Constructor(id, data, fireSet.child(id)));
        });
        
        fireSet.on('child_removed', function(item) {
            var id = item.name(),
                items = set(),
                setItem = getItemById(items, idProperty, id);        
            setRemove.call(set, setItem);
        });
        
        //Remove unsupported methods
        ['reverse', 'sort', 'splice', 'unshift'].forEach(function(method) {
            set[method] = function() {
                throw new Error("This method is not supported on FireSets. It will be implemented when ordered sets are finished.");
            };
        });
        
        //Replace the set methods with methods that call firebase
        set.pop = function(){
            var items = set(),
                setItem = items[items.length - 1];
            removeSetItem(fireSet, item[idProperty]);
        };    

        set.push = function(item) {
            //For some reason setting this method directly: set.push = fireSet.push
            //Causes an error inside firebase.
            //May be caused by other arguments from click event bindings
            fireSet.push().setWithPriority(item, 20);
        };

        set.shift = function() {
            var setItem = set()[0];
            removeSetItem(fireSet, item[idProperty]);
        };

        set.unshift = function() {
            //GET THE PRIORITY FROM THE REFERENCE!!!
            //var items = set(),
            //    firstItem
        };

        set.remove = function(item) {
            var items = set(),
                setItem = getItemById(items, idProperty, item[idProperty])
            removeSetItem(fireSet, item[idProperty]);
        };

        set.removeAll = function() {
            fireSet.remove();
        };
        
        //Slice is fine, doesn't need to change

        //return the (modified) observable array
        return set;
    };

    ko.fireModel = function(model, map, fireRef) {
        var keys = Object.keys(map);

        keys.forEach(function(property) {
            var base = ko.observable(),
                baseRef = fireRef.child(property);

            baseRef.on('value', function(snapshot) {
                base(snapshot.val());
            });
            
            model[property] = ko.computed({
                read: base,
                write: function(value) {
                    baseRef.set(value);
                }
            });
        });
    };
})(ko);

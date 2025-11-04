import src.app as module

print('before:', module.activities['Chess Club']['participants'])
module.unregister_from_activity('Chess Club', 'michael@mergington.edu')
print('after:', module.activities['Chess Club']['participants'])

# second call should raise
try:
    module.unregister_from_activity('Chess Club', 'michael@mergington.edu')
except Exception as e:
    print('second call raised:', type(e), e)

# invalid activity should raise
try:
    module.unregister_from_activity('NoSuch', 'x@y')
except Exception as e:
    print('bad activity raised:', type(e), e)

import socket

try:
    ips = socket.gethostbyname_ex(socket.gethostname())[-1]
except Exception as error:
    print(str(error))
    exit(0)

for i in range(len(ips)):
    print(f"{i}: {ips[i]}")
envStr = ''
try:
    ipNumber = int(input("Choose localhost IP number (-1 not using localhost IP, default=-1): "))
except:
    ipNumber = -1
if ipNumber < 0:
    print('Not using localhost IP - exiting.')
    exit(0)

ip = ips[ipNumber]
envStr += 'GRAPHQL_URL_0=localhost-remote:5000\n'
envStr += 'GRAPHQL_URL_1=localhost-remote:5001\n'
envStr += 'LOCALHOST_IP={0}\n'.format(ip)

print(envStr)
with open('.env', 'w') as f:
    f.write(envStr)

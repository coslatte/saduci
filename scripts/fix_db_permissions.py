import shutil
import subprocess
import time

# Set pg_hba.conf to trust
pg_hba = r'C:\Program Files\PostgreSQL\16\data\pg_hba.conf'
pg_hba_bak = r'C:\Program Files\PostgreSQL\16\data\pg_hba.conf.bak'

shutil.copy2(pg_hba, pg_hba_bak)
with open(pg_hba, 'r') as f:
    content = f.read()
content = content.replace('scram-sha-256', 'trust')
with open(pg_hba, 'w') as f:
    f.write(content)

# Restart PostgreSQL
subprocess.run(['net', 'stop', 'postgresql-x64-16'], capture_output=True, timeout=10)
time.sleep(1)
subprocess.run(['net', 'start', 'postgresql-x64-16'], capture_output=True, timeout=10)
time.sleep(2)

psql = r'C:\Program Files\PostgreSQL\16\bin\psql.exe'
db_configs = [
    ('user_db', 'user_user'),
    ('patient_db', 'patient_user'),
    ('prediction_db', 'prediction_user'),
    ('simulation_db', 'simulation_user'),
]

for db, user in db_configs:
    cmd = [psql, '-U', 'postgres', '-d', db, '-c', f'GRANT ALL ON SCHEMA public TO {user}; GRANT ALL ON ALL TABLES IN SCHEMA public TO {user}; GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO {user}; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {user};']
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10, stdin=subprocess.DEVNULL)
    if result.returncode != 0:
        print(f'Error for {db}/{user}: {result.stderr[:200]}')
    else:
        print(f'OK: {db}/{user}')

# Restore pg_hba.conf
shutil.copy2(pg_hba_bak, pg_hba)
subprocess.run(['net', 'stop', 'postgresql-x64-16'], capture_output=True, timeout=10)
time.sleep(1)
subprocess.run(['net', 'start', 'postgresql-x64-16'], capture_output=True, timeout=10)
time.sleep(2)
print('\nDone. Database permissions fixed.')

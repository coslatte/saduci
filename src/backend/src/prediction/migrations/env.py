from alembic import context

config = context.config
connection = config.attributes["connection"]
target_metadata = config.attributes["target_metadata"]
context.configure(connection=connection, target_metadata=target_metadata)
with context.begin_transaction():
    context.run_migrations()

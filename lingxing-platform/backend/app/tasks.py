import os
from celery import Celery

celery_app = Celery("lingxing_platform", broker=os.environ["REDIS_URL"], backend=os.environ["REDIS_URL"])
celery_app.conf.timezone = "Asia/Shanghai"
celery_app.conf.beat_schedule = {
    "daily-ready-jobs": {
        "task": "app.tasks.dispatch_daily_jobs",
        "schedule": 60.0,
    }
}

@celery_app.task(name="app.tasks.dispatch_daily_jobs")
def dispatch_daily_jobs():
    # The worker intentionally dispatches only jobs that have passed validation.
    # Concrete ETL runs are created by the API with an immutable endpoint/mapping version.
    return {"status": "scheduler_alive"}

@celery_app.task(bind=True, autoretry_for=(TimeoutError,), retry_backoff=True, retry_kwargs={"max_retries": 3})
def execute_etl_run(self, run_id: int):
    return {"run_id": run_id, "status": "pending_etl_mapping"}

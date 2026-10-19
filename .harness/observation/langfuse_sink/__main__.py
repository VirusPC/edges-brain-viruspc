"""`python3 -m langfuse_sink` sends the OTLP smoke span and prints its trace id."""

from langfuse_sink.smoke import main

raise SystemExit(main())

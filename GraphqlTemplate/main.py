import argparse

from PyTemplate import app


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--init",
                        help="Add --init to run service initialization only.",
                        action='store_true')
    arguments = parser.parse_args()
    if arguments.init:
        app.Init()
    else:
        app.Run()

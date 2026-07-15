{
  "patcher": {
    "fileversion": 1,
    "appversion": {
      "major": 9,
      "minor": 0,
      "revision": 0,
      "architecture": "x64",
      "modernui": 1
    },
    "classnamespace": "box",
    "rect": [100.0, 100.0, 360.0, 220.0],
    "default_fontname": "Arial",
    "default_fontsize": 12.0,
    "gridonopen": 1,
    "gridsize": [15.0, 15.0],
    "boxes": [
      {
        "box": {
          "id": "obj-1",
          "maxclass": "newobj",
          "text": "inlet~",
          "patching_rect": [55.0, 45.0, 42.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-2",
          "maxclass": "newobj",
          "text": "cross~ #1",
          "patching_rect": [55.0, 95.0, 72.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-3",
          "maxclass": "newobj",
          "text": "outlet~",
          "patching_rect": [100.0, 150.0, 48.0, 22.0]
        }
      },
      {
        "box": {
          "id": "obj-4",
          "maxclass": "comment",
          "text": "Local Max/MSP replacement for Pure Data hip~. Uses the high-pass outlet of cross~.",
          "patching_rect": [155.0, 90.0, 185.0, 55.0]
        }
      }
    ],
    "lines": [
      {
        "patchline": {
          "source": ["obj-1", 0],
          "destination": ["obj-2", 0]
        }
      },
      {
        "patchline": {
          "source": ["obj-2", 1],
          "destination": ["obj-3", 0]
        }
      }
    ]
  }
}

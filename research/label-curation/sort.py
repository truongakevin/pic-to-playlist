from genrelist import genres
import os
import json
import curses

def save_progress(valid_items, invalid_items, remaining_items, file_name="progress.json"):
    with open(file_name, 'w') as f:
        json.dump({
            'valid': valid_items,
            'invalid': invalid_items,
            'remaining': remaining_items
        }, f)

def load_progress(file_name="progress.json"):
    if os.path.exists(file_name):
        with open(file_name, 'r') as f:
            data = json.load(f)
        return data['valid'], data['invalid'], data['remaining']
    return [], [], []

def sort_items(stdscr):
    items = genres

    valid_items, invalid_items, remaining_items = load_progress()

    if not remaining_items:
        remaining_items = items.copy()

    try:
        while remaining_items:
            item = remaining_items.pop(0)
            stdscr.clear()
            stdscr.addstr(f"{item}\n")
            stdscr.refresh()

            while True:
                key = stdscr.getch()
                if key == ord('1'):
                    valid_items.append(item)
                    stdscr.addstr("1: Valid\n")
                    break
                elif key == ord('2'):
                    invalid_items.append(item)
                    stdscr.addstr("2: Invalid\n")
                    break
                elif key == ord('q'):
                    remaining_items.insert(0, item)
                    raise KeyboardInterrupt  # Use KeyboardInterrupt to exit
                else:
                    stdscr.addstr("Invalid key. Press '1' for Yes, '2' for No, or 'q' to Quit.\n")

            save_progress(valid_items, invalid_items, remaining_items)
            stdscr.refresh()
    except KeyboardInterrupt:
        stdscr.addstr("\nInterrupted. Progress saved.\n")
        stdscr.addstr(f"\n{len(valid_items)}\n")
        save_progress(valid_items, invalid_items, remaining_items)
        stdscr.refresh()
        stdscr.getch()

    stdscr.clear()
    stdscr.addstr("Sorting complete.\n")
    stdscr.addstr(f"Valid items: {valid_items}\n")
    stdscr.addstr(f"Invalid items: {invalid_items}\n")
    stdscr.refresh()
    stdscr.getch()

def main():
    curses.wrapper(sort_items)

if __name__ == "__main__":
    main()

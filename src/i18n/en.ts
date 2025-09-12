/**
 * English string table — the original application's values/strings.xml
 * values verbatim, minus the dropped export/update/dead-popup strings,
 * plus the added `invalid_word` validation string (the original had no
 * validation message).
 */

export const en = {
  app_name: "Learn Words Simply",
  word: "word",
  shown: "shown",
  progress_wt: "W->T\nprogress",
  progress_tw: "T->W\nprogress",
  right: "Right",
  mistake: "Mistake",
  no_words: "No words",
  invalid_word: "Invalid word",
  word_progress: "Progress: %1$d%% (%2$s)",
  words_in_dict: "Words in dictionary: %1$d",
  current_dict: "Dictionary: %s",
  status_dict_new: "Main",
  status_dict_repeat: "Repeat",
  foreign_word: "word",
  translation: "translation",
  choose_dictionary: "Choose a dictionary:",
  menu_Words: "Words",
  menu_Start: "Start",
  menu_Add: "Add a word",
  menu_Import: "Import/export",
  menu_Help: "Help",
  menu_import_from_file: "Import from file",
  menu_learn_8020: "Learn new words + repeat\n(80%/20%)",
  menu_learn_new_only: "Learn new words",
  menu_learn_repeat_only: "Repeat learned words",
  menu_dict_new: "Main dictionary",
  menu_dict_repeat: "Repeat dictionary",
  add_dictionary: "Add to the dictionary",
  title_move_known_word: "Move known word",
  message_move_known_word: "You have learned this word.\nDo you want to move it to the dictionary for repetition?",
  title_move_unknown_word: "Move unknown word",
  message_move_unknown_word: "You haven't learned this word.\nDo you want to move it to the main dictionary?",
  title_delete_known_word: "Delete known word",
  message_delete_known_word: "You have learned and repeated this word.\nDelete it completely?",
  title_activity_learn_words: "Learn words",
  title_activity_add_word: "Add word",
  title_activity_show_words: "All words",
  title_activity_import_words: "Import words",
  title_activity_help: "Help",
  title_activity_choose_dictionary: "Choose dictionary",
  title_delete_word: "Delete word",
  message_delete_word: "Are you sure you want to delete this word?",
  title_move_word: "Move word",
  message_move_word: "Are you sure you want to move this word?",
  error_title: "Error",
  error_load_dict:
    "Failed to load the dictionary.\nThe app will continue with an empty dictionary.",
} as const;

export type StringKey = keyof typeof en;

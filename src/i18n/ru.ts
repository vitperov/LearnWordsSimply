/**
 * Russian string table — the original application's values-ru/strings.xml
 * values verbatim, minus the dropped export/update/dead-popup strings,
 * plus the added `invalid_word` validation string (the original had no
 * validation message).
 */

import type { StringKey } from "./en.ts";

export const ru: Record<StringKey, string> = {
  app_name: "Learn Words Simply",
  word: "слово",
  shown: "выпадало",
  progress_wt: "С->П\nпрогресс",
  progress_tw: "П->С\nпрогресс",
  right: "Верно",
  mistake: "Ошибка",
  no_words: "Нет слов в словаре",
  invalid_word: "Недопустимое слово",
  word_progress: "Прогресс: %1$d%% (%2$s)",
  words_in_dict: "Слов в словаре: %1$d",
  current_dict: "Словарь: %s",
  status_dict_new: "Основной",
  status_dict_repeat: "для повторения",
  foreign_word: "слово",
  translation: "перевод",
  choose_dictionary: "Выберите словарь:",
  menu_Words: "Словарь",
  menu_Start: "Учить слова",
  menu_Add: "Добавить слово",
  menu_Import: "Импорт/Экспорт",
  menu_Help: "Справка",
  menu_import_from_file: "Импорт из файла",
  menu_learn_8020: "Учить новые слова + повторять\n(80%/20%)",
  menu_learn_new_only: "Учить новые слова",
  menu_learn_repeat_only: "Повторять выученные слова",
  menu_dict_new: "Основной словарь",
  menu_dict_repeat: "Словарь для повторения",
  add_dictionary: "Добавить слово в словарь",
  title_move_known_word: "Переместить выученное слово",
  message_move_known_word: "Похоже, что вы выучили это слово.\nПереместить его в словарь для повторения?",
  title_move_unknown_word: "Переместить невыученное слово",
  message_move_unknown_word: "Похоже, что вы забыли это слово.\nПереместить его в основной словарь?",
  title_delete_known_word: "Удалить выученное слово",
  message_delete_known_word: "Вы выучили и повторили это слово.\nУдалить его совсем?",
  title_activity_learn_words: "Тренировка",
  title_activity_add_word: "Добавить слово",
  title_activity_show_words: "Все слова",
  title_activity_import_words: "Импорт слов",
  title_activity_help: "Справка",
  title_activity_choose_dictionary: "Выбор словаря",
  title_delete_word: "Удалить слово",
  message_delete_word: "Вы уверены, что хотите удалить это слово?",
  title_move_word: "Переместить слово",
  message_move_word: "Вы уверены, что хотите переместить это слово?",
  error_title: "Ошибка",
  error_load_dict:
    "Не удалось загрузить словарь.\nПриложение продолжит работу с пустым словарём.",
};

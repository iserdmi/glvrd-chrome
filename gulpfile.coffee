gulp = require 'gulp'
zip = require 'gulp-zip'
tap = require 'gulp-tap'
path = require 'path'
fs = require 'fs'

remove_dir = (dir_path, remove_self=true) -> 
  try 
    files = fs.readdirSync dir_path
  catch e
    return
  if (files.length > 0)
    for file_path in files
      file_path = path.join dir_path, file_path
      if fs.statSync(file_path).isFile()
        fs.unlinkSync file_path
      else
        remove_dir file_path
  if remove_self
    fs.rmdirSync(dir_path)

gulp.task 'default', ->
  remove_dir 'extension', false
  gulp.src 'vendors/**'
    .pipe gulp.dest 'extension/vendors'
  gulp.src 'images/**'
    .pipe gulp.dest 'extension/images'
  gulp.src 'styles/**'
    .pipe gulp.dest 'extension/styles'
  gulp.src 'scripts/**'
    .pipe gulp.dest 'extension/scripts'
  gulp.src 'views/**'
    .pipe gulp.dest 'extension'
  gulp.src 'manifest.json'
    .pipe gulp.dest 'extension'

gulp.task 'copy_key_to_extension', ->
  gulp.src 'key.pem'
    .pipe gulp.dest 'extension'

gulp.task 'create_extension_archive', ['copy_key_to_extension'], ->
  gulp.src 'extension/*'
    .pipe zip 'extension.zip'
    .pipe gulp.dest ''

gulp.task 'dist', ['create_extension_archive'], ->
  fs.unlinkSync 'extension/key.pem'

gulp.task 'watch', ->
  gulp.watch ['scripts/**', 'images/**', 'styles/**', 'scripts/**', 'views/**', 'manifest.json']
    .on 'change', (e) ->
      src = path.relative(__dirname, e.path)
      src_parts = src.split(path.sep)
      if src_parts[0] is 'views'
        dest = 'extension'
      else
        dest = path.join 'extension', path.dirname(src)
      gulp.src src
        .pipe gulp.dest dest
  
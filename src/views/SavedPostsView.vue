<template>
    <h2 class="title">Saved Posts</h2>
    <div class="top-bar">
    <div class="filters-bar">
        <label>
            <input type="radio" name="filter" checked />
            All Folders
        </label>
        <label>
            <input type="radio" name="filter" />
            Shared Folders
        </label>
    </div>
    </div>
    <div class="folders-bar">
        <div class="folder" tabindex="0">
      <img src="@/assets/folder.png" alt="Folder" class="folder-img" />
      <div class="folder-name">Default Folder</div>
    </div>
  </div>
</template>

<style scoped>
.title {
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: black;
  position: absolute;
  left: 10%;
}

.top-bar {
  display: flex;
  gap: 2rem;
  margin-bottom: 1.5rem; /* Add spacing below filter bar */
  cursor: pointer;
  position: absolute;
  top: 27%;
  left: 10%;
}

.filters-bar {
  display: flex;
  gap: 2rem;
  font-size: 1rem;
  color: black;
}

.filters-bar input[type="radio"]:hover {
  cursor: pointer;
}

.folders-bar {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
  margin-top: 8rem;
}

.folder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.3rem 1.2rem;
  border-radius: 5px;
  background-color: rgb(123, 154, 213);
  color: #fff;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s;
  outline: none;
}

.folder:hover {
  background-color: rgb(58, 108, 151);
  color: #fff;
}

.folder-img {
  width: 55px;
  height: 55px;
  margin: 0.3rem;
  color:white;
}

.folder-name {
  font-size: 1rem;
  color: #fff;
  text-align: center;
}
</style>
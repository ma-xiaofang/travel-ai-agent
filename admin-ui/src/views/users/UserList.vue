<template>
  <div class="page">
    <h2>用户列表</h2>

    <!-- 搜索栏 -->
    <el-form :inline="true" :model="filter" class="filter-bar">
      <el-form-item label="关键字">
        <el-input v-model="filter.keyword" placeholder="用户名 / 邮箱 / 手机 / 昵称" clearable
          style="width: 260px" @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="角色">
        <el-select v-model="filter.role" placeholder="全部" clearable style="width: 120px">
          <el-option label="管理员" value="ADMIN" />
          <el-option label="普通用户" value="USER" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">查询</el-button>
        <el-button @click="resetFilter">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 表格 -->
    <el-table :data="users" v-loading="loading" stripe>
      <el-table-column prop="username" label="用户名" min-width="120" />
      <el-table-column prop="email" label="邮箱" min-width="180">
        <template #default="{ row }">{{ row.email ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="phone" label="手机" min-width="130">
        <template #default="{ row }">{{ row.phone ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="nickName" label="昵称" min-width="100">
        <template #default="{ row }">{{ row.nickName ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="gender" label="性别" width="70" align="center">
        <template #default="{ row }">
          {{ row.gender === 'MALE' ? '男' : row.gender === 'FEMALE' ? '女' : row.gender === 'OTHER' ? '其他' : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="age" label="年龄" width="70" align="center">
        <template #default="{ row }">{{ row.age ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="role" label="角色" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.role === 'ADMIN' ? 'danger' : 'info'" size="small">
            {{ row.role === 'ADMIN' ? '管理员' : '用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="注册时间" width="170">
        <template #default="{ row }">{{ fmt(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="openEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap" v-if="total > 0">
      <el-pagination
        v-model:current-page="filter.page"
        :page-size="filter.pageSize"
        :total="total"
        layout="total, prev, pager, next, sizes"
        :page-sizes="[10, 20, 50]"
        @current-change="fetchUsers"
        @size-change="onPageSizeChange"
      />
    </div>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="editVisible" title="编辑用户" width="480px" @closed="editFormRef?.resetFields()">
      <el-form ref="editFormRef" :model="editForm" label-width="70px">
        <el-form-item label="用户名">
          <span>{{ editForm.username }}</span>
        </el-form-item>
        <el-form-item label="昵称" prop="nickName">
          <el-input v-model="editForm.nickName" maxlength="50" />
        </el-form-item>
        <el-form-item label="性别" prop="gender">
          <el-select v-model="editForm.gender" placeholder="请选择" clearable style="width: 100%">
            <el-option label="男" value="MALE" />
            <el-option label="女" value="FEMALE" />
            <el-option label="其他" value="OTHER" />
          </el-select>
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="editForm.age" :min="0" :max="150" style="width: 100%" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="editForm.role" style="width: 100%">
            <el-option label="普通用户" value="USER" />
            <el-option label="管理员" value="ADMIN" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { listUsers, updateUser } from '@/api/admin-users'

const users = ref([])
const loading = ref(false)
const total = ref(0)

const filter = reactive({
  keyword: '',
  role: '',
  page: 1,
  pageSize: 20,
})

const editVisible = ref(false)
const saving = ref(false)
const editFormRef = ref(null)
const editForm = reactive({
  id: '',
  username: '',
  nickName: '',
  gender: '',
  age: null,
  role: 'USER',
})

function fmt(iso) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

async function fetchUsers() {
  loading.value = true
  try {
    const params = {
      page: filter.page,
      pageSize: filter.pageSize,
    }
    if (filter.keyword) params.keyword = filter.keyword
    if (filter.role) params.role = filter.role
    const res = await listUsers(params)
    users.value = res.data.items
    total.value = res.data.total
  } catch {
    // 401 等错误由 HTTP 拦截器统一处理
  } finally {
    loading.value = false
  }
}

function search() {
  filter.page = 1
  fetchUsers()
}

function resetFilter() {
  filter.keyword = ''
  filter.role = ''
  filter.page = 1
  fetchUsers()
}

function onPageSizeChange(size) {
  filter.pageSize = size
  filter.page = 1
  fetchUsers()
}

function openEdit(row) {
  editForm.id = row.id
  editForm.username = row.username
  editForm.nickName = row.nickName ?? ''
  editForm.gender = row.gender ?? ''
  editForm.age = row.age
  editForm.role = row.role
  editVisible.value = true
}

async function handleSave() {
  saving.value = true
  try {
    await updateUser(editForm.id, {
      nickName: editForm.nickName || undefined,
      gender: editForm.gender || undefined,
      age: editForm.age != null ? editForm.age : undefined,
      role: editForm.role,
    })
    ElMessage.success('保存成功')
    editVisible.value = false
    fetchUsers()
  } finally {
    saving.value = false
  }
}

onMounted(fetchUsers)
</script>

<style scoped>
.page { background: #fff; padding: 24px; border-radius: 4px; }
.page h2 { margin: 0 0 16px 0; }
.filter-bar { margin-bottom: 16px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>

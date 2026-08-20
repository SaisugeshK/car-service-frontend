import { useEffect, useState } from 'react';
import CrudPage from './CrudPage';
import usersService from '../services/usersService';
import rolesService from '../services/rolesService';
import { userSchema } from '../utils/validationSchemas';
import Loader from '../components/Loader';

export default function Users() {
  const [roles, setRoles] = useState(null);

  useEffect(() => {
    rolesService.getAll().then((data) => {
      const list = Array.isArray(data) ? data : data?.content || [];
      setRoles(list);
    });
  }, []);

  if (!roles) return <Loader label="Loading roles..." />;

  const config = {
    title: 'Users',
    entityName: 'User',
    service: usersService,
    searchKeys: ['username', 'email', 'fullName'],
    defaultValues: {
      username: '',
      firstName: '',
      lastName: '',
      email: '',
      mobileNumber: '',
      password: '',
      roleId: '',
      status: 'ACTIVE',
    },
    schema: userSchema,
    columns: [
      { key: 'id', label: 'ID', sortable: true },
      { key: 'username', label: 'Username', sortable: true },
      { key: 'email', label: 'Email' },
      { key: 'mobileNumber', label: 'Mobile' },
      {
        key: 'roleId',
        label: 'Role',
        render: (row) => roles.find((r) => r.id === row.roleId)?.roleName || row.roleId,
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => (
          <span className={`badge ${row.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
            {row.status}
          </span>
        ),
      },
    ],
    fields: [
      { name: 'username', label: 'Username', required: true },
      { name: 'firstName', label: 'First Name' },
      { name: 'lastName', label: 'Last Name' },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'mobileNumber', label: 'Mobile Number' },
      { name: 'password', label: 'Password', type: 'password' },
      {
        name: 'roleId',
        label: 'Role',
        type: 'select',
        required: true,
        valueKey: 'id',
        labelKey: 'roleName',
        options: roles,
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'INACTIVE', label: 'Inactive' },
        ],
      },
    ],
  };

  return <CrudPage config={config} />;
}
